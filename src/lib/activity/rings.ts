import type { SessionSummary } from "@/types";

export interface ActivityRing {
  id: string;
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}

export interface ActivityRingsData {
  rings: ActivityRing[];
  periodLabel: string;
}

function sessionsThisWeek(history: SessionSummary[]): SessionSummary[] {
  const weekAgo = Date.now() - 7 * 24 * 3_600_000;
  return history.filter((s) => new Date(s.completedAt).getTime() >= weekAgo);
}

function estimateCalories(s: SessionSummary, weightKg: number): number {
  const mins = s.durationSec / 60;
  const met =
    s.sport === "boxing" ? 9 : s.sport === "tennis" ? 7 : 6;
  return Math.round(met * weightKg * mins * 0.0175);
}

function estimateTonnage(s: SessionSummary, weightKg: number): number {
  if (s.sport !== "strength") return 0;
  const reps = s.reps ?? Math.round(s.durationSec / 8);
  const load =
    s.exercise === "squat"
      ? weightKg * 0.9
      : s.exercise === "bench"
        ? weightKg * 0.65
        : weightKg * 0.5;
  return Math.round(reps * load);
}

export function computeActivityRings(
  history: SessionSummary[],
  weightKg = 75
): ActivityRingsData {
  const week = sessionsThisWeek(history);
  const visits = week.length;
  const calories = week.reduce((a, s) => a + estimateCalories(s, weightKg), 0);
  const tonnage = week.reduce((a, s) => a + estimateTonnage(s, weightKg), 0);

  const visitGoal = 5;
  const calorieGoal = 600;
  const tonnageGoal = 5000;

  return {
    periodLabel: "За неделю",
    rings: [
      {
        id: "visits",
        label: "Зал",
        value: visits,
        goal: visitGoal,
        unit: "визитов",
        color: "var(--neon-cyan, #00d4ff)",
      },
      {
        id: "calories",
        label: "Калории",
        value: calories,
        goal: calorieGoal,
        unit: "ккал",
        color: "var(--neon-orange, #ff6b2c)",
      },
      {
        id: "tonnage",
        label: "Тоннаж",
        value: tonnage,
        goal: tonnageGoal,
        unit: "кг",
        color: "#4ade80",
      },
    ],
  };
}
