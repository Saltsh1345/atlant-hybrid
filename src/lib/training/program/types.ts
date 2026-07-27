import type { PlanExercise } from "@/lib/plan/types";
import type { TrainingIntakeRecord } from "@/lib/training/intake/types";

export type ProgramSource = "engine" | "gemini" | "hybrid";

/** Один тренировочный день внутри program_json. */
export interface ProgramDay {
  dayIndex: number;
  /** YYYY-MM-DD — заполняется при materialize */
  planDate?: string;
  label: string;
  restDay: boolean;
  exercises: PlanExercise[];
  durationMin: number;
  focus: string;
}

/** Неделя мезоцикла. */
export interface ProgramWeek {
  weekIndex: number;
  deload: boolean;
  days: ProgramDay[];
}

/** Сериализуемая структура в training_programs.program_json. */
export interface ProgramJson {
  version: 1;
  weeks: ProgramWeek[];
}

/** Запись активной программы из Supabase. */
export interface StoredTrainingProgram {
  id: string;
  userId: string;
  title: string;
  primaryGoal: string;
  experienceLevel: string;
  trainingLocation: string;
  weeksTotal: number;
  currentWeek: number;
  programJson: ProgramJson;
  source: ProgramSource;
  status: "active" | "completed" | "paused";
  startedAt: string | null;
  createdAt: string;
}

/** Результат генерации перед сохранением. */
export interface GeneratedProgram {
  title: string;
  programJson: ProgramJson;
  source: ProgramSource;
  intakeSnapshot: TrainingIntakeRecord;
  scanSnapshot: Record<string, unknown> | null;
  dailyPlans: Array<{
    planDate: string;
    weekIndex: number;
    dayIndex: number;
    plan: import("@/lib/plan/types").DailyPlan;
  }>;
}
