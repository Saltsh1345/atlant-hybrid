import type { TrainingIntakeRecord } from "@/lib/training/intake/types";
import type { PlanGenerationContext } from "@/lib/plan/types";
import { scienceContextForPrompt } from "@/lib/training/science/rules";
import { experienceTrainingAgeHint } from "@/lib/training/intake/suggestProgramWeeks";
import { buildConstraintProfile } from "@/lib/training/corrective/buildConstraintProfile";
import { HEALTH_CONCERN_LABELS } from "@/lib/training/intake/types";

/**
 * Текстовый блок для Gemini / engine: опросник + полная биоверификация + правила.
 */
export function buildIntelligentPlanningContext(
  intake: TrainingIntakeRecord,
  planContext: PlanGenerationContext,
): string {
  const bioBlock =
    planContext.bioScan?.promptBlock ??
    "Биоверификация: данные скана отсутствуют.";

  const constraints = buildConstraintProfile({
    bioScan: planContext.bioScan,
    healthConcerns: intake.healthConcerns ?? [],
    notes: intake.notes ?? null,
  });

  const healthLines =
    (intake.healthConcerns?.length ?? 0) > 0
      ? intake.healthConcerns!.map((id) => HEALTH_CONCERN_LABELS[id]).join(", ")
      : "не указаны";

  return [
    "=== ОПРОСНИК ПОЛЬЗОВАТЕЛЯ ===",
    `Цель: ${intake.primaryGoal}`,
    `Опыт: ${intake.experienceLevel} (${experienceTrainingAgeHint(intake.experienceLevel)})`,
    `Локация: ${intake.trainingLocation}`,
    `Дней в неделю: ${intake.daysPerWeek}`,
    `Длина программы: ${intake.programWeeksFinal} нед. (рекомендация системы: ${intake.programWeeksSuggested})`,
    `Ограничения/дискомфорт (клиент): ${healthLines}`,
    intake.notes ? `Комментарий: ${intake.notes}` : "",
    "",
    bioBlock,
    "",
    constraints.promptBlock,
    "=== ПРОФИЛЬ (Health / Supabase) ===",
    `Рост: ${planContext.heightCm ?? "—"} см, вес тела: ${planContext.weightKg ?? "—"} кг, возраст: ${planContext.age ?? "—"}`,
    "",
    "=== ПРАВИЛА СИЛОВОЙ ПОДГОТОВКИ ===",
    scienceContextForPrompt({
      goal: intake.primaryGoal,
      location: intake.trainingLocation,
      daysPerWeek: intake.daysPerWeek,
      weeks: intake.programWeeksFinal,
      bioScan: planContext.bioScan,
    }),
  ]
    .filter(Boolean)
    .join("\n");
}
