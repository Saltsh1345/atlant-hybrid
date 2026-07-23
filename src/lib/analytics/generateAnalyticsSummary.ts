import { generateAnalysis } from "@/lib/ai/gemini";
import type { AnalyticsSessionRow } from "@/lib/analytics/types";

function localFallbackSummary(session: AnalyticsSessionRow): string {
  const fatigue = session.summary?.fatiguePercent ?? 0;
  const failed = session.summary?.failed === true;
  const avg = session.avgVelocity ?? session.summary?.verticalVelocityMs ?? 0;
  const peak = session.peakVelocity ?? session.summary?.peakVelocityMs ?? 0;
  const reps = session.reps ?? 0;

  return [
    `Сессия ${session.exercise ?? session.sport}: ${session.durationSec} с, ${reps} повторов, средняя скорость ${avg.toFixed(2)} м/с, пик ${peak.toFixed(2)} м/с.`,
    failed
      ? "По VBT зафиксирован отказный участок: на следующем подходе снизьте темп и проверьте глубину и колени."
      : fatigue >= 20
        ? "Скорость просела относительно базы: держите технику и не разгоняйте отказные повторы."
        : "Скорость держалась стабильно: можно чуть увеличить рабочий акцент на целевых мышцах при чистой технике.",
    "Ближайший план: 1) контрольный подход на технику, 2) рабочий блок с мониторингом VBT, 3) лёгкая активация недоработавших зон из атласа.",
  ].join(" ");
}

/** Серверная генерация резюме post-workout через существующий Gemini-модуль. */
export async function generateAnalyticsSummary(session: AnalyticsSessionRow): Promise<{
  text: string;
  source: "gemini" | "fallback";
  reason?: string;
}> {
  try {
    const fatigue = session.summary?.fatiguePercent ?? 0;
    const { text, source, reason } = await generateAnalysis({
      sport: session.sport,
      exercise: session.exercise ?? undefined,
      durationSec: session.durationSec,
      avgVelocity: session.avgVelocity ?? session.summary?.verticalVelocityMs ?? 0,
      peakPunchSpeed:
        session.peakVelocity ?? session.summary?.peakVelocityMs ?? 0,
      peakVelocity:
        session.peakVelocity ?? session.summary?.peakVelocityMs ?? undefined,
      fatigue,
      formScore: session.formScore ?? undefined,
      reps: session.reps ?? undefined,
    });
    if (text?.trim()) {
      return {
        text: text.trim(),
        source: source === "gemini" ? "gemini" : "fallback",
        reason,
      };
    }
  } catch (error) {
    return {
      text: localFallbackSummary(session),
      source: "fallback",
      reason: error instanceof Error ? error.message : "unknown",
    };
  }

  return { text: localFallbackSummary(session), source: "fallback" };
}
