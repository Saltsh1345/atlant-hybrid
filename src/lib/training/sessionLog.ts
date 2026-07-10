import type { SessionSummary, Sport, StrengthExercise } from "@/types";
import type { ExerciseLog, SetRecord } from "@/types/training";
import { exerciseById } from "@/lib/training/exerciseCatalog";

export function buildExerciseLogFromSession(
  summary: SessionSummary,
  plannedRestSec = 90
): ExerciseLog | null {
  const reps = summary.reps ?? 0;
  if (reps <= 0 && summary.sport !== "boxing" && summary.sport !== "tennis") {
    return null;
  }

  const exId =
    summary.exercise ??
    (summary.sport === "boxing"
      ? "boxing_drill"
      : summary.sport === "tennis"
        ? "tennis_drill"
        : "squat");

  const def = exerciseById(
    typeof exId === "string" ? exId : exId
  );
  const name = def?.name ?? String(exId);

  const setCount =
    summary.sport === "strength" ? Math.min(5, Math.max(1, Math.ceil(reps / 8))) : 3;

  const repsPerSet =
    summary.sport === "strength"
      ? Math.max(1, Math.round(reps / setCount))
      : 1;

  const sets: SetRecord[] = [];
  for (let i = 0; i < setCount; i++) {
    sets.push({
      setIndex: i + 1,
      reps: repsPerSet,
      restSecAfter: plannedRestSec,
      avgVelocityMs: summary.avgVelocity,
      formScore: summary.formScore,
      completedAt: summary.completedAt,
    });
  }

  return {
    id: `log-${summary.completedAt}`,
    exerciseId: def?.id ?? String(exId),
    name,
    sport: summary.sport,
    sets,
    sessionCompletedAt: summary.completedAt,
  };
}

export function totalSetsInHistory(logs: ExerciseLog[]): number {
  return logs.reduce((s, l) => s + l.sets.length, 0);
}

export function logsForExercise(
  logs: ExerciseLog[],
  exerciseId: string
): ExerciseLog[] {
  return logs.filter((l) => l.exerciseId === exerciseId);
}
