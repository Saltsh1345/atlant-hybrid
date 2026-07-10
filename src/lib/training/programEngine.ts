import type { UserProfile } from "@/types";
import type {
  TrainingProgram,
  TrainingDay,
  TrainingWeek,
  WorkoutBlock,
  VideoDiagnosticReport,
  PlannedSet,
} from "@/types/training";
import type { ReadinessReport } from "@/lib/readiness";
import {
  EXERCISE_CATALOG,
  exerciseById,
  exercisesForMuscleGroup,
} from "@/lib/training/exerciseCatalog";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function programId(): string {
  return `prog-${Date.now().toString(36)}`;
}

function blockFromExercise(
  exId: string,
  weakZoneId?: string,
  intensity: "low" | "normal" | "high" = "normal"
): WorkoutBlock | null {
  const ex = exerciseById(exId);
  if (!ex) return null;

  const scale = intensity === "low" ? 0.85 : intensity === "high" ? 1.15 : 1;
  const sets: PlannedSet[] = ex.defaultSets.map((s) => ({
    reps: Math.max(1, Math.round(s.reps * scale)),
    restSec: s.restSec,
    targetFormMin: 72,
    targetVelocityMs: ex.vbtTargetMs,
  }));

  return {
    exerciseId: ex.id,
    name: ex.name,
    sport: ex.sport,
    strengthExercise: ex.strengthExercise,
    sets,
    targetMuscles: ex.primaryMuscles,
    weakZoneId,
    notes:
      weakZoneId
        ? "Приоритет по видеодиагностике"
        : undefined,
  };
}

function pickExercisesForWeakZones(
  diagnostic: VideoDiagnosticReport
): { exId: string; weakZoneId: string }[] {
  const picks: { exId: string; weakZoneId: string }[] = [];
  for (const z of diagnostic.weakZones.slice(0, 4)) {
    const candidates = exercisesForMuscleGroup(z.muscleGroup);
    const ex = candidates[0];
    if (ex && !picks.some((p) => p.exId === ex.id)) {
      picks.push({ exId: ex.id, weakZoneId: z.id });
    }
  }
  if (!picks.length) {
    picks.push({ exId: "squat", weakZoneId: "default" });
    picks.push({ exId: "plank_core", weakZoneId: "default" });
  }
  return picks;
}

function buildDay(
  dayIndex: number,
  blocks: WorkoutBlock[],
  restDay = false
): TrainingDay {
  const estimatedMin = restDay
    ? 0
    : blocks.reduce(
        (sum, b) =>
          sum +
          b.sets.reduce((s, set) => s + set.restSec, 0) / 60 +
          b.sets.length * 1.2,
        5
      );

  return {
    dayIndex,
    label: DAY_LABELS[dayIndex] ?? `День ${dayIndex + 1}`,
    restDay,
    blocks,
    estimatedMin: Math.round(estimatedMin),
  };
}

export function generateTrainingProgram(opts: {
  diagnostic: VideoDiagnosticReport;
  profile: UserProfile;
  readiness: ReadinessReport;
}): TrainingProgram {
  const { diagnostic, profile, readiness } = opts;
  const lowReadiness = readiness.overall < 55;
  const intensity: "low" | "normal" | "high" = lowReadiness
    ? "low"
    : readiness.overall > 80
      ? "high"
      : "normal";

  const weakPicks = pickExercisesForWeakZones(diagnostic);
  const days: TrainingDay[] = [];

  for (let d = 0; d < 7; d++) {
    if (d === 2 || d === 6) {
      days.push(buildDay(d, [], true));
      continue;
    }

    const blocks: WorkoutBlock[] = [];
    const pick = weakPicks[d % weakPicks.length];
    const primary = blockFromExercise(pick.exId, pick.weakZoneId, intensity);
    if (primary) blocks.push(primary);

    if (d % 2 === 0 && profile.goal !== "lose_weight") {
      const secondary = blockFromExercise(
        d % 4 === 0 ? "bench" : "lunge",
        undefined,
        intensity
      );
      if (secondary && secondary.exerciseId !== primary?.exerciseId) {
        blocks.push(secondary);
      }
    }

    if (profile.goal === "performance" || profile.goal === "lose_weight") {
      const cardio =
        d % 3 === 1
          ? blockFromExercise("boxing_drill", undefined, "normal")
          : blockFromExercise("tennis_drill", undefined, "normal");
      if (cardio) blocks.push(cardio!);
    }

    if (diagnostic.weakZones.some((z) => z.muscleGroup === "Кор")) {
      const core = blockFromExercise("plank_core", "wz-core", "normal");
      if (core && !blocks.some((b) => b.exerciseId === "plank_core")) {
        blocks.push(core);
      }
    }

    days.push(buildDay(d, blocks));
  }

  const week: TrainingWeek = { weekIndex: 0, days };

  return {
    id: programId(),
    generatedAt: new Date().toISOString(),
    diagnosticId: diagnostic.id,
    title:
      profile.goal === "gain_muscle"
        ? "Гипертрофия · слабые зоны"
        : profile.goal === "lose_weight"
          ? "Сжигание + техника"
          : "Видеодиагностика · план 7 дней",
    weeks: [week],
  };
}

/** Текущий день программы (0 = понедельник). */
export function getTodayTrainingDay(program: TrainingProgram | null): TrainingDay | null {
  if (!program?.weeks[0]) return null;
  const jsDay = new Date().getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  return program.weeks[0].days[dayIndex] ?? null;
}

export function formatSetPlan(sets: PlannedSet[]): string {
  return sets
    .map((s, i) => `${i + 1}×${s.reps} · отдых ${s.restSec}с`)
    .join(" → ");
}
