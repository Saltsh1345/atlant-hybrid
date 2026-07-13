import type { Sport, UserProfile, SessionSummary } from "@/types";
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
  exercisesBySport,
  CATEGORY_LABELS,
  type ExerciseDef,
} from "@/lib/training/exerciseCatalog";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const HYPERTROPHY_SPLIT: string[][] = [
  ["squat", "romanian_deadlift", "calf_raise"],
  ["bench", "barbell_row", "lateral_raise"],
  ["deadlift", "leg_press", "hip_thrust"],
  ["overhead_press", "pull_up", "triceps_extension"],
  ["lunge", "biceps_curl", "plank_core"],
];

const BOXING_SPLIT: string[][] = [
  ["shadow_boxing", "medicine_ball_slam", "footwork_ladder"],
  ["boxing_drill", "landmine_press", "jump_rope"],
  ["heavy_bag_intervals", "rotational_core_boxing", "battle_ropes"],
  ["footwork_ladder", "plyo_pushup", "shadow_boxing"],
  ["sled_push", "boxing_drill", "medicine_ball_slam"],
];

const TENNIS_SPLIT: string[][] = [
  ["tennis_drill", "split_step_drill", "lateral_cone_hops"],
  ["serve_motion_drill", "single_leg_rdl", "rotator_cuff"],
  ["tennis_footwork", "med_ball_rotational_throw", "agility_ladder"],
  ["lateral_lunge_tennis", "tennis_drill", "split_step_drill"],
  ["serve_motion_drill", "single_leg_rdl", "lateral_cone_hops"],
];

const FAT_LOSS_SPLIT: string[][] = [
  ["jump_rope", "squat", "plank_core"],
  ["boxing_drill", "lunge", "battle_ropes"],
  ["tennis_drill", "leg_press", "split_step_drill"],
  ["shadow_boxing", "bench", "rotational_core_boxing"],
  ["agility_ladder", "romanian_deadlift", "plank_core"],
];

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
    targetFormMin: ex.trackingMode === "pose" ? 72 : undefined,
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
    category: ex.category,
    equipment: ex.equipment,
    description: ex.description,
    trackingMode:
      ex.trackingMode ?? (ex.strengthExercise ? "pose" : "guided"),
    notes: weakZoneId
      ? `Приоритет · ${CATEGORY_LABELS[ex.category]}`
      : CATEGORY_LABELS[ex.category],
  };
}

function bestExerciseForWeakZone(
  zone: VideoDiagnosticReport["weakZones"][number],
  usedIds: Set<string>
): ExerciseDef | undefined {
  const candidates = exercisesForMuscleGroup(zone.muscleGroup).filter(
    (e) => !usedIds.has(e.id)
  );
  if (!candidates.length) return undefined;

  const scored = candidates.map((ex) => {
    let score = 0;
    if (ex.trackingMode === "pose" && zone.severity > 60) score += 3;
    if (ex.category === "hypertrophy") score += 2;
    if (ex.category === "core" && zone.muscleGroup === "Кор") score += 3;
    if (ex.sport === "strength") score += 1;
    return { ex, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.ex;
}

function pickExercisesForWeakZones(
  diagnostic: VideoDiagnosticReport
): { exId: string; weakZoneId: string }[] {
  const picks: { exId: string; weakZoneId: string }[] = [];
  const used = new Set<string>();

  for (const z of diagnostic.weakZones.slice(0, 4)) {
    const ex = bestExerciseForWeakZone(z, used);
    if (ex) {
      picks.push({ exId: ex.id, weakZoneId: z.id });
      used.add(ex.id);
    }
  }

  if (!picks.length) {
    picks.push({ exId: "squat", weakZoneId: "default" });
    picks.push({ exId: "plank_core", weakZoneId: "default" });
  }
  return picks;
}

function resolvePreferredSport(
  profile: UserProfile,
  selectedSport: Sport | null | undefined,
  sessionHistory: SessionSummary[]
): Sport {
  if (selectedSport) return selectedSport;

  const counts: Record<Sport, number> = {
    strength: 0,
    boxing: 0,
    tennis: 0,
  };
  for (const s of sessionHistory.slice(0, 8)) {
    counts[s.sport]++;
  }
  const top = (Object.entries(counts) as [Sport, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  if (profile.goal === "gain_muscle") return "strength";
  if (profile.goal === "performance" && top && counts[top] > 0) return top;
  return top ?? "strength";
}

function splitForGoal(
  goal: UserProfile["goal"],
  sport: Sport
): string[][] {
  if (goal === "gain_muscle" || goal === "maintain") {
    if (sport === "boxing") {
      return BOXING_SPLIT.map((day, i) =>
        i % 2 === 0 ? day : [HYPERTROPHY_SPLIT[i % 5]![0]!, ...day.slice(1)]
      );
    }
    if (sport === "tennis") {
      return TENNIS_SPLIT.map((day, i) =>
        i % 2 === 0 ? day : [HYPERTROPHY_SPLIT[i % 5]![0]!, ...day.slice(1)]
      );
    }
    return HYPERTROPHY_SPLIT;
  }
  if (goal === "lose_weight") return FAT_LOSS_SPLIT;
  if (sport === "boxing") return BOXING_SPLIT;
  if (sport === "tennis") return TENNIS_SPLIT;
  return HYPERTROPHY_SPLIT;
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

function uniqueBlocks(...ids: (string | null | undefined)[]): WorkoutBlock[] {
  const blocks: WorkoutBlock[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    const block = blockFromExercise(id);
    if (block) {
      blocks.push(block);
      seen.add(id);
    }
  }
  return blocks;
}

export function generateTrainingProgram(opts: {
  diagnostic: VideoDiagnosticReport;
  profile: UserProfile;
  readiness: ReadinessReport;
  selectedSport?: Sport | null;
  sessionHistory?: SessionSummary[];
}): TrainingProgram {
  const { diagnostic, profile, readiness } = opts;
  const sessionHistory = opts.sessionHistory ?? [];
  const sport = resolvePreferredSport(
    profile,
    opts.selectedSport,
    sessionHistory
  );

  const lowReadiness = readiness.overall < 55;
  const intensity: "low" | "normal" | "high" = lowReadiness
    ? "low"
    : readiness.overall > 80
      ? "high"
      : "normal";

  const weakPicks = pickExercisesForWeakZones(diagnostic);
  const split = splitForGoal(profile.goal, sport);
  const days: TrainingDay[] = [];
  let trainIdx = 0;

  for (let d = 0; d < 7; d++) {
    if (d === 2 || d === 6) {
      days.push(buildDay(d, [], true));
      continue;
    }

    const dayTemplate = split[trainIdx % split.length] ?? split[0]!;
    const weakPick = weakPicks[trainIdx % weakPicks.length]!;

    const weakBlock = blockFromExercise(
      weakPick.exId,
      weakPick.weakZoneId,
      intensity
    );

    const blocks = uniqueBlocks(weakBlock?.exerciseId, ...dayTemplate).map(
      (b) => {
        if (b.exerciseId === weakBlock?.exerciseId && weakBlock) {
          return {
            ...b,
            weakZoneId: weakBlock.weakZoneId,
            notes: weakBlock.notes,
          };
        }
        return blockFromExercise(b.exerciseId, undefined, intensity) ?? b;
      }
    );

    if (
      diagnostic.weakZones.some((z) => z.muscleGroup === "Кор") &&
      !blocks.some((b) => b.category === "core")
    ) {
      const core = blockFromExercise("plank_core", "wz-core", intensity);
      if (core) blocks.push(core);
    }

    days.push(buildDay(d, blocks.slice(0, 4)));
    trainIdx++;
  }

  const week: TrainingWeek = { weekIndex: 0, days };
  const catalogSize = EXERCISE_CATALOG.length;
  const sportCount = exercisesBySport(sport).length;

  const titleByGoal: Record<UserProfile["goal"], string> = {
    gain_muscle: `Гипертрофия · ${catalogSize} упр.`,
    lose_weight: `Сжигание + техника · ${catalogSize} упр.`,
    performance:
      sport === "boxing"
        ? `Бокс S&C · ${sportCount} упр.`
        : sport === "tennis"
          ? `Теннис S&C · ${sportCount} упр.`
          : `Производительность · ${catalogSize} упр.`,
    maintain: `Баланс · ${catalogSize} упр.`,
  };

  return {
    id: programId(),
    generatedAt: new Date().toISOString(),
    diagnosticId: diagnostic.id,
    title: titleByGoal[profile.goal],
    weeks: [week],
  };
}

export function getTodayTrainingDay(
  program: TrainingProgram | null
): TrainingDay | null {
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
