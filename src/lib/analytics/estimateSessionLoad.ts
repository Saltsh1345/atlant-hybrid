import type { AnalyticsSessionRow } from "@/lib/analytics/types";

/** Оценка тоннажа: вес тела × коэффициент упражнения × число повторов. */
export function estimateTonnageKg(
  session: AnalyticsSessionRow,
  weightKg: number,
): number {
  if (session.sport !== "strength") return 0;
  const reps = session.reps ?? Math.max(1, Math.round(session.durationSec / 8));
  const exercise = session.exercise ?? "squat";
  const loadFactor =
    exercise === "squat" ? 0.9 : exercise === "bench" ? 0.65 : 0.5;
  return Math.round(reps * weightKg * loadFactor);
}

/** Оценка потраченных ккал (локально; в Health API не пишется). */
export function estimateCaloriesKcal(
  session: AnalyticsSessionRow,
  weightKg: number,
): number {
  const mins = Math.max(1, session.durationSec / 60);
  const met =
    session.sport === "boxing" ? 9 : session.sport === "tennis" ? 7 : 6;
  return Math.round(met * weightKg * mins * 0.0175);
}

/**
 * Реконструкция деградации скорости из summary сессии.
 * Полной покадровой серии Stage 4 не сохраняет.
 */
export function buildVelocityDegradationSeries(
  session: AnalyticsSessionRow | null,
): { label: string; velocityMs: number; note?: string }[] {
  if (!session) return [];
  const summary = session.summary ?? {};
  const baseline =
    summary.baselineVelocityMs ??
    session.avgVelocity ??
    session.peakVelocity ??
    0;
  const peak =
    summary.peakVelocityMs ?? session.peakVelocity ?? baseline;
  const avg =
    summary.verticalVelocityMs ?? session.avgVelocity ?? baseline;
  const fatigue = summary.fatiguePercent ?? 0;
  const failed = summary.failed === true;

  if (!(baseline > 0 || peak > 0 || avg > 0)) return [];

  const late = Math.max(
    0,
    baseline * (1 - Math.min(80, Math.max(0, fatigue)) / 100),
  );

  return [
    { label: "1", velocityMs: Number(baseline.toFixed(2)), note: "базовая" },
    { label: "пик", velocityMs: Number(peak.toFixed(2)), note: "пик" },
    { label: "средняя", velocityMs: Number(avg.toFixed(2)), note: "средняя" },
    {
      label: "конец",
      velocityMs: Number(late.toFixed(2)),
      note: failed ? "отказ" : "утомление",
    },
  ];
}
