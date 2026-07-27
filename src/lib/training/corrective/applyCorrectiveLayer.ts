import { exerciseById, type ExerciseDef } from "@/lib/training/exerciseCatalog";
import type { PlanExercise } from "@/lib/plan/types";
import { equipmentAllowedAtLocation } from "@/lib/training/science/rules";
import type { TrainingLocation } from "@/lib/training/intake/types";
import type { BodyConstraintProfile, ExercisePlanRole } from "@/lib/training/corrective/types";
import {
  CORRECTIVE_POOL,
  EXERCISE_SWAPS,
  TAG_PRIORITY,
  metaForExercise,
} from "@/lib/training/corrective/exerciseMeta";

export interface CorrectivePlanOptions {
  location: TrainingLocation;
  deload: boolean;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  constraints: BodyConstraintProfile;
  maxExercises?: number;
  maxCorrectives?: number;
}

interface ConstraintTagMatch {
  tag: import("@/lib/training/corrective/types").ConstraintTag;
  exerciseId: string;
}

function toPlanExercise(
  def: ExerciseDef,
  sets: number,
  reps: number,
  restSec: number,
  extras?: {
    role?: ExercisePlanRole;
    correctionReason?: string;
    hint?: string;
  },
): PlanExercise {
  return {
    exerciseId: def.id,
    name: def.name,
    sets: Math.max(1, Math.min(6, Math.round(sets))),
    reps: Math.max(1, Math.min(30, Math.round(reps))),
    restSec: Math.max(15, Math.min(240, Math.round(restSec))),
    targetMuscles: [...def.primaryMuscles],
    equipment: def.equipment,
    hint: extras?.hint ?? def.hints?.[0],
    role: extras?.role ?? "main",
    correctionReason: extras?.correctionReason,
  };
}

function isContraindicated(
  exerciseId: string,
  activeTags: Set<string>,
): ConstraintTagMatch | null {
  const meta = metaForExercise(exerciseId);
  for (const tag of TAG_PRIORITY) {
    if (activeTags.has(tag) && meta.contraindicated.includes(tag)) {
      return { tag, exerciseId };
    }
  }
  return null;
}

function resolveSwap(
  exerciseId: string,
  conflictTag: import("@/lib/training/corrective/types").ConstraintTag,
  location: TrainingLocation,
  activeTags: Set<string>,
  used: Set<string>,
): { id: string; reason: string } | null {
  const swaps = EXERCISE_SWAPS[exerciseId];
  if (!swaps) return null;

  const candidates: string[] = [];
  if (swaps[conflictTag]) candidates.push(swaps[conflictTag]!);
  for (const tag of TAG_PRIORITY) {
    if (activeTags.has(tag) && swaps[tag] && !candidates.includes(swaps[tag]!)) {
      candidates.push(swaps[tag]!);
    }
  }

  for (const altId of candidates) {
    if (used.has(altId)) continue;
    const altDef = exerciseById(altId);
    if (!altDef) continue;
    if (!equipmentAllowedAtLocation(location, altDef.equipment)) continue;
    if (isContraindicated(altId, activeTags)) continue;
    const def = exerciseById(exerciseId);
    return {
      id: altId,
      reason: `Замена «${def?.name ?? exerciseId}» — учёт ограничения (${conflictTag}).`,
    };
  }
  return null;
}

function pickCorrectives(
  activeTags: readonly import("@/lib/training/corrective/types").ConstraintTag[],
  used: Set<string>,
  location: TrainingLocation,
  constraints: BodyConstraintProfile,
  maxCorrectives: number,
): Array<{ id: string; tag: import("@/lib/training/corrective/types").ConstraintTag; reason: string }> {
  const picked: Array<{
    id: string;
    tag: import("@/lib/training/corrective/types").ConstraintTag;
    reason: string;
  }> = [];

  for (const tag of TAG_PRIORITY) {
    if (!activeTags.includes(tag)) continue;
    const pool = CORRECTIVE_POOL[tag] ?? [];
    for (const id of pool) {
      if (picked.length >= maxCorrectives) return picked;
      if (used.has(id)) continue;
      const def = exerciseById(id);
      if (!def) continue;
      if (!equipmentAllowedAtLocation(location, def.equipment)) continue;
      if (isContraindicated(id, new Set(activeTags))) continue;

      const source = constraints.sources.find((s) => s.tag === tag);
      picked.push({
        id,
        tag,
        reason: source
          ? `Коррекция: ${source.label}`
          : `Укрепление зоны (${tag})`,
      });
      used.add(id);
      break;
    }
  }

  return picked;
}

/**
 * Строит день: силовые упражнения с заменами + коррекционный слой (prehab).
 */
export function applyCorrectiveLayer(
  exerciseIds: string[],
  opts: CorrectivePlanOptions,
): PlanExercise[] {
  const activeSet = new Set(opts.constraints.activeTags);
  const volumeScale = opts.deload ? 0.7 : 1;
  const setsBase =
    opts.experienceLevel === "beginner"
      ? 3
      : opts.experienceLevel === "advanced"
        ? 4
        : 3;

  const used = new Set<string>();
  const result: PlanExercise[] = [];

  for (const rawId of exerciseIds) {
    let id = rawId;
    let role: ExercisePlanRole = "main";
    let correctionReason: string | undefined;

    const conflict = isContraindicated(id, activeSet);
    if (conflict) {
      const swap = resolveSwap(id, conflict.tag, opts.location, activeSet, used);
      if (swap) {
        id = swap.id;
        role = "substitution";
        correctionReason = swap.reason;
      } else {
        continue;
      }
    }

    if (used.has(id)) continue;
    const def = exerciseById(id);
    if (!def) continue;
    if (!equipmentAllowedAtLocation(opts.location, def.equipment)) continue;

    used.add(id);
    const defaultSet = def.defaultSets[0] ?? { reps: 10, restSec: 60 };
    const sets = Math.max(2, Math.round(setsBase * volumeScale));
    const reps = opts.deload
      ? Math.max(6, Math.round(defaultSet.reps * 0.85))
      : defaultSet.reps;

    const correctiveSets =
      role === "substitution" ? sets : sets;
    const correctiveReps = role === "substitution" ? reps : reps;

    result.push(
      toPlanExercise(def, correctiveSets, correctiveReps, defaultSet.restSec, {
        role,
        correctionReason,
      }),
    );
  }

  const correctives = pickCorrectives(
    opts.constraints.activeTags,
    used,
    opts.location,
    opts.constraints,
    opts.maxCorrectives ?? 2,
  );

  for (const c of correctives) {
    const def = exerciseById(c.id);
    if (!def) continue;
    const defaultSet = def.defaultSets[0] ?? { reps: 12, restSec: 45 };
    const sets = def.category === "core" ? 3 : 2;
    const reps = def.category === "core" ? 30 : defaultSet.reps;

    result.push(
      toPlanExercise(def, sets, reps, defaultSet.restSec, {
        role: "corrective",
        correctionReason: c.reason,
        hint: def.hints?.[0] ?? "Контролируйте технику, без боли в проблемной зоне.",
      }),
    );
  }

  return result.slice(0, opts.maxExercises ?? 6);
}

/** Пост-обработка плана Gemini / fallback. */
export function applyCorrectiveLayerToPlanExercises(
  exercises: PlanExercise[],
  opts: Omit<CorrectivePlanOptions, "maxExercises"> & { maxExercises?: number },
): { exercises: PlanExercise[]; tips: string[] } {
  const ids = exercises.map((e) => e.exerciseId);
  const corrected = applyCorrectiveLayer(ids, {
    ...opts,
    maxCorrectives: opts.maxCorrectives ?? 2,
    maxExercises: opts.maxExercises ?? 6,
  });

  const tips: string[] = [];
  if (opts.constraints.activeTags.length > 0) {
    tips.push(opts.constraints.summaryRu);
    const subs = corrected.filter((e) => e.role === "substitution" || e.role === "corrective");
    for (const ex of subs.slice(0, 3)) {
      if (ex.correctionReason) tips.push(ex.correctionReason);
    }
  }

  return { exercises: corrected, tips };
}
