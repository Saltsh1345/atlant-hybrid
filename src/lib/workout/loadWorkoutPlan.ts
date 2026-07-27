import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { DailyPlan } from "@/lib/plan/types";

export interface LoadedWorkoutPlan {
  plan: DailyPlan;
  planId: string;
  programId: string | null;
}

/** Загружает план тренировки на дату для live-режима. */
export async function loadWorkoutPlan(
  planDate: string,
): Promise<{ data?: LoadedWorkoutPlan; error?: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Не авторизован" };

  const { data, error } = await supabase
    .from("workout_plans")
    .select(
      "id, plan_date, source, title, focus, duration_min, exercises, tips, target_meshes, not_recovered_groups, reason, program_id, week_index, day_index",
    )
    .eq("user_id", user.id)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "На этот день нет плана. Сгенерируйте на /plan." };

  const plan: DailyPlan = {
    id: data.id,
    planDate: data.plan_date,
    source: data.source,
    title: data.title,
    focus: data.focus,
    durationMin: data.duration_min,
    exercises: data.exercises ?? [],
    tips: data.tips ?? [],
    targetMeshes: data.target_meshes ?? [],
    notRecoveredGroups: data.not_recovered_groups ?? [],
    reason: data.reason ?? undefined,
    programId: data.program_id ?? null,
    weekIndex: data.week_index ?? null,
    dayIndex: data.day_index ?? null,
  };

  if (plan.exercises.length === 0) {
    return { error: "План пуст — нет упражнений." };
  }

  return {
    data: {
      plan,
      planId: data.id,
      programId: data.program_id ?? null,
    },
  };
}
