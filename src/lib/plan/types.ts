/**
 * Контракты Этапа 3 — `/plan`.
 * Не заменяют существующие типы тренировок: DailyPlan — узкий DTO
 * для дневного плана Gemini/fallback и хранения в Supabase `workout_plans`.
 */

export type PlanSource = "gemini" | "fallback";

export interface PlanExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  restSec: number;
  /** mesh-имена мышц для подсветки атласа (chest_l и т.д.) */
  targetMuscles: string[];
  equipment?: string;
  hint?: string;
}

export interface DailyPlan {
  /** YYYY-MM-DD */
  planDate: string;
  title: string;
  focus: string;
  durationMin: number;
  source: PlanSource;
  exercises: PlanExercise[];
  tips: string[];
  /** Группы readiness ниже порога восстановления (русские имена) */
  notRecoveredGroups: string[];
  /** mesh-имена целевых мышц дня */
  targetMeshes: string[];
  reason?: string;
}

/** Одна выполненная тренировка из Supabase `workout_sessions`. */
export interface PlanSessionRow {
  id: string;
  completedAt: string;
  sport: string;
  exercise: string | null;
  durationSec: number;
  formScore: number | null;
}

/** Контекст пользователя для генерации плана. */
export interface PlanGenerationContext {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  bodyFatPercentage: number | null;
  hyperlordosisLikely: boolean | null;
  anthropometrics: Record<string, unknown> | null;
  posture: Record<string, unknown> | null;
  goal: string | null;
  recentSessions: PlanSessionRow[];
  readinessGroups: { name: string; percent: number }[];
  readinessOverall: number;
}
