import type { LatchedBodyData, SessionSummary } from "@/types";

export interface MuscleGroupReadiness {
  name: string;
  percent: number;
}

export interface ReadinessReport {
  overall: number;
  label: string;
  groups: MuscleGroupReadiness[];
}

const GROUPS = ["Ноги", "Спина", "Грудь", "Плечи", "Кор"];

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

/**
 * Simulated readiness — NOT recalculated from camera per frame.
 * Based on latched body + session recovery time.
 */
export function computeMuscleReadiness(
  latchedBody: LatchedBodyData | null,
  lastSession: SessionSummary | null,
  history: SessionSummary[]
): ReadinessReport {
  if (!latchedBody) {
    return {
      overall: 0,
      label: "Нет данных",
      groups: GROUPS.map((name) => ({ name, percent: 0 })),
    };
  }

  const base = Math.min(95, 55 + latchedBody.musclePercent * 0.35);
  const hours = lastSession ? hoursSince(lastSession.completedAt) : 48;
  const recovery = Math.min(1, hours / 24);
  const fatiguePenalty = lastSession
    ? Math.min(25, lastSession.durationSec / 30 + (lastSession.formScore ?? 70) * 0.05)
    : 0;

  const recentCount = history.filter((s) => hoursSince(s.completedAt) < 48).length;
  const overloadPenalty = Math.min(15, recentCount * 4);

  const overall = Math.round(
    Math.max(35, Math.min(98, base * recovery + 20 - fatiguePenalty - overloadPenalty))
  );

  const sportBias: Record<string, number> = {};
  if (lastSession?.sport === "strength") {
    sportBias["Ноги"] = -12;
    sportBias["Спина"] = -8;
    if (lastSession.exercise === "bench") sportBias["Грудь"] = -15;
  }
  if (lastSession?.sport === "boxing") {
    sportBias["Плечи"] = -14;
    sportBias["Кор"] = -10;
  }
  if (lastSession?.sport === "tennis") {
    sportBias["Плечи"] = -12;
    sportBias["Спина"] = -10;
  }

  const groups = GROUPS.map((name) => {
    const bias = sportBias[name] ?? 0;
    const jitter = (name.charCodeAt(0) % 7) - 3;
    const pct = Math.round(
      Math.max(30, Math.min(100, overall + bias + jitter * recovery))
    );
    return { name, percent: pct };
  });

  const label =
    overall >= 85
      ? "Готов к нагрузке"
      : overall >= 65
        ? "Умеренная готовность"
        : overall >= 45
          ? "Восстановление"
          : "Нужен отдых";

  return { overall, label, groups };
}
