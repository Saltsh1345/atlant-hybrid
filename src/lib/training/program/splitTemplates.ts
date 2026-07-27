import type { TrainingPrimaryGoal } from "@/lib/training/intake/types";

export type SplitDayKey =
  | "full_a"
  | "full_b"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "legs"
  | "conditioning";

/** Шаблон дня: exerciseId[] в порядке выполнения. */
export const SPLIT_DAY_EXERCISES: Record<SplitDayKey, string[]> = {
  full_a: ["squat", "bench", "seated_row", "plank_core"],
  full_b: ["deadlift", "overhead_press", "lat_pulldown", "lunge"],
  upper: ["bench", "barbell_row", "overhead_press", "lat_pulldown", "biceps_curl"],
  lower: ["squat", "romanian_deadlift", "leg_press", "calf_raise", "plank_core"],
  push: ["bench", "overhead_press", "lateral_raise", "triceps_extension"],
  pull: ["deadlift", "barbell_row", "lat_pulldown", "face_pull", "biceps_curl"],
  legs: ["squat", "leg_press", "romanian_deadlift", "lunge", "calf_raise"],
  conditioning: ["push_up", "lunge", "plank_core", "hip_thrust"],
};

export const SPLIT_DAY_LABELS: Record<SplitDayKey, string> = {
  full_a: "Full Body A",
  full_b: "Full Body B",
  upper: "Верх тела",
  lower: "Низ тела",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  conditioning: "Круговая",
};

/** Сплит по цели и частоте (2–6 дней/нед.). */
export function splitDaysForIntake(
  goal: TrainingPrimaryGoal,
  daysPerWeek: number,
): SplitDayKey[] {
  const d = Math.max(2, Math.min(6, daysPerWeek));

  if (d <= 2) {
    return goal === "lose_weight" || goal === "health"
      ? ["full_a", "conditioning"]
      : ["full_a", "full_b"];
  }
  if (d === 3) {
    if (goal === "strength") return ["full_a", "full_b", "full_a"];
    return ["push", "pull", "legs"];
  }
  if (d === 4) return ["upper", "lower", "upper", "lower"];
  if (d === 5) return ["push", "pull", "legs", "upper", "lower"];
  return ["push", "pull", "legs", "push", "pull", "legs"];
}

/** Индексы дней недели (0=Пн … 6=Вс) для размещения тренировок. */
export function weekdaySlots(daysPerWeek: number): number[] {
  const slots: Record<number, number[]> = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
  };
  return slots[Math.max(2, Math.min(6, daysPerWeek))] ?? slots[3]!;
}
