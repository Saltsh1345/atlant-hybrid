import { buildConstraintProfile } from "@/lib/training/corrective/buildConstraintProfile";
import { applyCorrectiveLayer } from "@/lib/training/corrective/applyCorrectiveLayer";
import type { PlanExercise } from "@/lib/plan/types";
import type { PlanGenerationContext } from "@/lib/plan/types";
import type { TrainingIntakeRecord } from "@/lib/training/intake/types";

export function constraintProfileFromContext(
  context: PlanGenerationContext,
  intake?: TrainingIntakeRecord | null,
) {
  const record = intake ?? context.trainingIntake;
  return buildConstraintProfile({
    bioScan: context.bioScan,
    healthConcerns: record?.healthConcerns ?? [],
    notes: record?.notes ?? null,
  });
}

export function buildDayExercises(
  exerciseIds: string[],
  opts: {
    location: import("@/lib/training/intake/types").TrainingLocation;
    deload: boolean;
    experienceLevel: "beginner" | "intermediate" | "advanced";
    context: PlanGenerationContext;
    intake: TrainingIntakeRecord;
  },
): PlanExercise[] {
  const constraints = constraintProfileFromContext(opts.context, opts.intake);
  return applyCorrectiveLayer(exerciseIds, {
    location: opts.location,
    deload: opts.deload,
    experienceLevel: opts.experienceLevel,
    constraints,
    maxExercises: 6,
    maxCorrectives: 2,
  });
}
