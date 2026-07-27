import type {
  TrainingExperienceLevel,
  TrainingIntakeAnswers,
  TrainingPrimaryGoal,
} from "@/lib/training/intake/types";
import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";

export interface ProgramWeeksSuggestion {
  weeks: number;
  rationale: string;
}

/**
 * Эвристика длины программы (4–12 нед.) по цели и опыту.
 * Учитывает полный профиль биоверификации (осанка, состав, пропорции).
 */
export function suggestProgramWeeks(
  answers: Pick<
    TrainingIntakeAnswers,
    "primaryGoal" | "experienceLevel" | "programWeeksChoice"
  >,
  bio?: BioScanProfile | null,
): ProgramWeeksSuggestion {
  if (answers.programWeeksChoice !== "ai") {
    return {
      weeks: answers.programWeeksChoice,
      rationale: "Выбранная вами длительность программы.",
    };
  }

  const { primaryGoal, experienceLevel } = answers;
  let weeks = 8;
  const parts: string[] = [];

  if (experienceLevel === "beginner") {
    weeks = primaryGoal === "lose_weight" ? 8 : 12;
    parts.push("новичкам нужен более длинный цикл адаптации");
  } else if (experienceLevel === "intermediate") {
    weeks =
      primaryGoal === "strength"
        ? 6
        : primaryGoal === "lose_weight"
          ? 8
          : 10;
    parts.push("средний уровень — стандартный мезоцикл");
  } else {
    weeks = primaryGoal === "strength" ? 6 : 8;
    parts.push("опытным атлетам достаточно короткого целевого блока");
  }

  if (primaryGoal === "lose_weight") {
    parts.push("похудение: 8+ недель для устойчивой адаптации метаболизма");
    weeks = Math.max(weeks, 8);
  }
  if (primaryGoal === "health") {
    weeks = Math.max(weeks, 8);
    parts.push("здоровье/осанка: больше времени на технику и кор");
  }

  if (bio && !bio.scanUsable) {
    weeks = Math.min(12, weeks + 2);
    parts.push("качество биоскана низкое — +2 нед. на технику и повторную верификацию");
  }

  const posturePriority = bio?.findings.filter((f) => f.severity === "priority") ?? [];
  if (posturePriority.length > 0) {
    weeks = Math.min(12, weeks + 1);
    parts.push(
      `биоскан: ${posturePriority.length} приоритетных находок (осанка/состав) — +1 нед. на коррекцию`,
    );
  }

  if (bio?.hyperlordosisLikely === true) {
    weeks = Math.min(12, weeks + 1);
    parts.push("биоскан: выраженный изгиб поясницы — больше времени на кор");
  }

  weeks = Math.min(12, Math.max(4, weeks));

  return {
    weeks,
    rationale: parts.join("; ") + ".",
  };
}

export function resolveProgramWeeksFinal(
  answers: TrainingIntakeAnswers,
  suggested: number,
): number {
  if (answers.programWeeksChoice === "ai") return suggested;
  return answers.programWeeksChoice;
}

export function goalToLegacyFitnessGoal(
  goal: TrainingPrimaryGoal,
): "lose_weight" | "gain_muscle" | "maintain" | "performance" {
  switch (goal) {
    case "lose_weight":
      return "lose_weight";
    case "gain_muscle":
    case "recomposition":
      return "gain_muscle";
    case "performance":
      return "performance";
    default:
      return "maintain";
  }
}

export function experienceTrainingAgeHint(level: TrainingExperienceLevel): string {
  switch (level) {
    case "beginner":
      return "linear progression, technique priority, lower weekly volume";
    case "intermediate":
      return "undulating volume, 10–20 hard sets per muscle group per week";
    case "advanced":
      return "periodized blocks, RPE/RIR, deload every 4–6 weeks";
  }
}
