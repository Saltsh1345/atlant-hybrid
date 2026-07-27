import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { DailyPlan, PlanExercise, PlanSessionRow } from "@/lib/plan/types";

interface WorkoutPlanRow {
  id?: string;
  plan_date: string;
  source: "gemini" | "fallback";
  title: string;
  focus: string;
  duration_min: number;
  exercises: PlanExercise[];
  tips: string[];
  target_meshes: string[];
  not_recovered_groups: string[];
  reason: string | null;
  program_id?: string | null;
  week_index?: number | null;
  day_index?: number | null;
}

function rowToPlan(row: WorkoutPlanRow): DailyPlan {
  return {
    id: row.id,
    planDate: row.plan_date,
    source: row.source,
    title: row.title,
    focus: row.focus,
    durationMin: row.duration_min,
    exercises: row.exercises ?? [],
    tips: row.tips ?? [],
    targetMeshes: row.target_meshes ?? [],
    notRecoveredGroups: row.not_recovered_groups ?? [],
    reason: row.reason ?? undefined,
    programId: row.program_id ?? null,
    weekIndex: row.week_index ?? null,
    dayIndex: row.day_index ?? null,
  };
}

/** Сохраняет план дня (upsert по user_id + plan_date). */
export async function savePlan(plan: DailyPlan): Promise<{ error?: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Не авторизован" };

  const payload: Record<string, unknown> = {
    user_id: user.id,
    plan_date: plan.planDate,
    source: plan.source,
    title: plan.title,
    focus: plan.focus,
    duration_min: plan.durationMin,
    exercises: plan.exercises,
    tips: plan.tips,
    target_meshes: plan.targetMeshes,
    not_recovered_groups: plan.notRecoveredGroups,
    reason: plan.reason ?? null,
    updated_at: new Date().toISOString(),
  };

  if (plan.programId !== undefined) payload.program_id = plan.programId;
  if (plan.weekIndex !== undefined) payload.week_index = plan.weekIndex;
  if (plan.dayIndex !== undefined) payload.day_index = plan.dayIndex;

  const { error } = await supabase.from("workout_plans").upsert(payload, {
    onConflict: "user_id,plan_date",
  });

  return error ? { error: error.message } : {};
}

/** Загружает планы за диапазон дат включительно (YYYY-MM-DD). */
export async function loadPlansInRange(
  fromDate: string,
  toDate: string,
): Promise<DailyPlan[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];

  const { data } = await supabase
    .from("workout_plans")
    .select(
      "id, plan_date, source, title, focus, duration_min, exercises, tips, target_meshes, not_recovered_groups, reason, program_id, week_index, day_index",
    )
    .eq("user_id", user.id)
    .gte("plan_date", fromDate)
    .lte("plan_date", toDate)
    .order("plan_date", { ascending: true });

  return ((data ?? []) as WorkoutPlanRow[]).map(rowToPlan);
}

/** Загружает один план по дате. */
export async function loadPlanByDate(
  planDate: string,
): Promise<DailyPlan | null> {
  const plans = await loadPlansInRange(planDate, planDate);
  return plans[0] ?? null;
}

/** Загружает выполненные тренировки за диапазон дат (для календаря истории). */
export async function loadSessionsInRange(
  fromIso: string,
  toIso: string,
): Promise<PlanSessionRow[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];

  const { data } = await supabase
    .from("workout_sessions")
    .select("id, completed_at, sport, exercise, duration_sec, form_score")
    .eq("user_id", user.id)
    .gte("completed_at", fromIso)
    .lte("completed_at", toIso)
    .order("completed_at", { ascending: false });

  return (
    (data ?? []) as Array<{
      id: string;
      completed_at: string;
      sport: string;
      exercise: string | null;
      duration_sec: number;
      form_score: number | null;
    }>
  ).map((row) => ({
    id: row.id,
    completedAt: row.completed_at,
    sport: row.sport,
    exercise: row.exercise,
    durationSec: row.duration_sec,
    formScore: row.form_score,
  }));
}
