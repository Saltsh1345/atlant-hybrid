import type { PlanExercise } from "@/lib/plan/types";
import type { WorkoutMetrics } from "@/lib/workout/types";

export interface SetLogDraft {
  setIndex: number;
  plannedReps: number;
  actualReps: number;
  weightKg: number | null;
  avgVelocityMs: number;
  skipped: boolean;
}

export interface PersistSetLogInput {
  sessionId: string;
  sessionExerciseId: string;
  setIndex: number;
  plannedReps: number;
  actualReps: number;
  weightKg: number | null;
  avgVelocityMs: number;
  skipped?: boolean;
}

/** Создаёт in_progress сессию, привязанную к плану. */
export async function createWorkoutSessionFromPlan(opts: {
  planId: string;
  programId: string | null;
  planDate: string;
  title: string;
}): Promise<{ sessionId?: string; error?: string }> {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      completed_at: new Date().toISOString(),
      sport: "strength",
      exercise: opts.title,
      duration_sec: 0,
      plan_id: opts.planId,
      program_id: opts.programId,
      session_status: "in_progress",
      summary: { planDate: opts.planDate },
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Не удалось создать сессию" };
  return { sessionId: data.id as string };
}

/** Создаёт или возвращает строку упражнения в сессии. */
export async function ensureSessionExercise(opts: {
  sessionId: string;
  exercise: PlanExercise;
  sortOrder: number;
}): Promise<{ sessionExerciseId?: string; error?: string }> {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Не авторизован" };

  const { data: existing } = await supabase
    .from("workout_session_exercises")
    .select("id")
    .eq("session_id", opts.sessionId)
    .eq("exercise_id", opts.exercise.exerciseId)
    .eq("sort_order", opts.sortOrder)
    .maybeSingle();

  if (existing?.id) return { sessionExerciseId: existing.id as string };

  const plannedSets = Array.from({ length: opts.exercise.sets }, (_, i) => ({
    setIndex: i,
    reps: opts.exercise.reps,
    restSec: opts.exercise.restSec,
  }));

  const { data, error } = await supabase
    .from("workout_session_exercises")
    .insert({
      session_id: opts.sessionId,
      user_id: user.id,
      exercise_id: opts.exercise.exerciseId,
      exercise_name: opts.exercise.name,
      sort_order: opts.sortOrder,
      planned_sets: plannedSets,
      target_muscles: opts.exercise.targetMuscles,
      completed: false,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Не удалось создать упражнение" };
  return { sessionExerciseId: data.id as string };
}

/** Записывает один подход в workout_set_logs. */
export async function persistSetLog(
  input: PersistSetLogInput,
): Promise<{ error?: string }> {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase.from("workout_set_logs").insert({
    session_exercise_id: input.sessionExerciseId,
    session_id: input.sessionId,
    user_id: user.id,
    set_index: input.setIndex,
    planned_reps: input.plannedReps,
    actual_reps: input.actualReps,
    weight_kg: input.weightKg,
    avg_velocity_ms: input.avgVelocityMs,
    skipped: input.skipped ?? false,
    completed_at: new Date().toISOString(),
  });

  return error ? { error: error.message } : {};
}

/** Завершает сессию с итоговыми метриками. */
export async function finishWorkoutSession(opts: {
  sessionId: string;
  durationSec: number;
  lastExerciseId: string;
  metrics: WorkoutMetrics;
  totalReps: number;
}): Promise<{ error?: string }> {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { error } = await supabase
    .from("workout_sessions")
    .update({
      completed_at: new Date().toISOString(),
      exercise: opts.lastExerciseId,
      duration_sec: opts.durationSec,
      avg_velocity: opts.metrics.verticalVelocityMs,
      peak_velocity: opts.metrics.peakVelocityMs,
      reps: opts.totalReps,
      session_status: "completed",
      summary: {
        verticalVelocityMs: opts.metrics.verticalVelocityMs,
        peakVelocityMs: opts.metrics.peakVelocityMs,
        fatiguePercent: opts.metrics.fatiguePercent,
        failed: opts.metrics.failed,
        planDriven: true,
      },
    })
    .eq("id", opts.sessionId);

  return error ? { error: error.message } : {};
}

/** Помечает упражнение сессии выполненным. */
export async function markSessionExerciseComplete(
  sessionExerciseId: string,
): Promise<{ error?: string }> {
  const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser");
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { error } = await supabase
    .from("workout_session_exercises")
    .update({ completed: true })
    .eq("id", sessionExerciseId);

  return error ? { error: error.message } : {};
}
