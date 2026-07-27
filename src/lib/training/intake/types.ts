/** Ответы опросника Этапа 6 — умный тренинг. */

export type TrainingPrimaryGoal =
  | "lose_weight"
  | "gain_muscle"
  | "strength"
  | "health"
  | "performance"
  | "recomposition";

export type TrainingExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced";

export type TrainingLocation = "home" | "gym" | "both";

export type ProgramWeeksChoice = 4 | 6 | 8 | 12 | "ai";

/** Структурированные жалобы/ограничения клиента (не диагноз). */
export type HealthConcernId =
  | "lower_back"
  | "knee"
  | "shoulder"
  | "neck"
  | "hip"
  | "wrist_elbow"
  | "post_surgery"
  | "general_mobility";

export const HEALTH_CONCERN_LABELS: Record<HealthConcernId, string> = {
  lower_back: "Поясница / спина",
  knee: "Колени",
  shoulder: "Плечи",
  neck: "Шея",
  hip: "Бедро / таз",
  wrist_elbow: "Запястья / локти",
  post_surgery: "После операции / реабилитация",
  general_mobility: "Общая скованность / мобility",
};

export interface TrainingIntakeAnswers {
  primaryGoal: TrainingPrimaryGoal;
  experienceLevel: TrainingExperienceLevel;
  trainingLocation: TrainingLocation;
  daysPerWeek: number;
  programWeeksChoice: ProgramWeeksChoice;
  /** Отмеченные зоны дискомфорта / ограничений */
  healthConcerns?: HealthConcernId[];
  notes?: string;
}

export interface TrainingIntakeRecord extends TrainingIntakeAnswers {
  programWeeksSuggested: number;
  programWeeksFinal: number;
  letAiSuggestWeeks: boolean;
  completedAt: string;
}

export const GOAL_LABELS: Record<TrainingPrimaryGoal, string> = {
  lose_weight: "Похудение",
  gain_muscle: "Набор мышечной массы",
  strength: "Сила",
  health: "Здоровье и осанка",
  performance: "Спортивная форма",
  recomposition: "Рекомпозиция (жир ↓, мышцы ↑)",
};

export const EXPERIENCE_LABELS: Record<TrainingExperienceLevel, string> = {
  beginner: "Новичок (до 6 мес.)",
  intermediate: "Средний (6 мес. – 2 года)",
  advanced: "Опытный (2+ года)",
};

export const LOCATION_LABELS: Record<TrainingLocation, string> = {
  home: "Дома",
  gym: "Спортивный зал",
  both: "И дом, и зал",
};

export const WEEKS_LABELS: Record<Exclude<ProgramWeeksChoice, "ai">, string> = {
  4: "4 недели — короткий цикл",
  6: "6 недель",
  8: "8 недель — сбалансировано",
  12: "12 недель — полный мезоцикл",
};
