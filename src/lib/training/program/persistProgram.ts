import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { GeneratedProgram, StoredTrainingProgram } from "@/lib/training/program/types";

interface PersistProgramResult {
  programId?: string;
  error?: string;
  plansSaved?: number;
}

/** Сохраняет программу и materialize workout_plans на все training days. */
export async function persistProgram(
  generated: GeneratedProgram,
): Promise<PersistProgramResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Не авторизован" };

  const intake = generated.intakeSnapshot;

  await supabase
    .from("training_programs")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active");

  const { data: programRow, error: programError } = await supabase
    .from("training_programs")
    .insert({
      user_id: user.id,
      title: generated.title,
      primary_goal: intake.primaryGoal,
      experience_level: intake.experienceLevel,
      training_location: intake.trainingLocation,
      weeks_total: intake.programWeeksFinal,
      current_week: 1,
      program_json: generated.programJson,
      source: generated.source,
      intake_snapshot: intake,
      scan_snapshot: generated.scanSnapshot,
      status: "active",
      started_at: generated.dailyPlans[0]?.planDate ?? new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (programError || !programRow) {
    return { error: programError?.message ?? "Не удалось сохранить программу" };
  }

  const programId = programRow.id as string;
  let plansSaved = 0;

  for (const day of generated.dailyPlans) {
    const { error } = await supabase.from("workout_plans").upsert(
      {
        user_id: user.id,
        plan_date: day.planDate,
        source: day.plan.source,
        title: day.plan.title,
        focus: day.plan.focus,
        duration_min: day.plan.durationMin,
        exercises: day.plan.exercises,
        tips: day.plan.tips,
        target_meshes: day.plan.targetMeshes,
        not_recovered_groups: day.plan.notRecoveredGroups,
        reason: day.plan.reason ?? null,
        program_id: programId,
        week_index: day.weekIndex,
        day_index: day.dayIndex,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,plan_date" },
    );
    if (!error) plansSaved++;
  }

  return { programId, plansSaved };
}

/** Серверная версия для Route Handler. */
export async function persistProgramServer(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  generated: GeneratedProgram,
): Promise<PersistProgramResult> {
  const intake = generated.intakeSnapshot;

  await supabase
    .from("training_programs")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: programRow, error: programError } = await supabase
    .from("training_programs")
    .insert({
      user_id: userId,
      title: generated.title,
      primary_goal: intake.primaryGoal,
      experience_level: intake.experienceLevel,
      training_location: intake.trainingLocation,
      weeks_total: intake.programWeeksFinal,
      current_week: 1,
      program_json: generated.programJson,
      source: generated.source,
      intake_snapshot: intake,
      scan_snapshot: generated.scanSnapshot,
      status: "active",
      started_at: generated.dailyPlans[0]?.planDate ?? new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (programError || !programRow) {
    return { error: programError?.message ?? "Не удалось сохранить программу" };
  }

  const programId = programRow.id as string;
  let plansSaved = 0;

  for (const day of generated.dailyPlans) {
    const { error } = await supabase.from("workout_plans").upsert(
      {
        user_id: userId,
        plan_date: day.planDate,
        source: day.plan.source,
        title: day.plan.title,
        focus: day.plan.focus,
        duration_min: day.plan.durationMin,
        exercises: day.plan.exercises,
        tips: day.plan.tips,
        target_meshes: day.plan.targetMeshes,
        not_recovered_groups: day.plan.notRecoveredGroups,
        reason: day.plan.reason ?? null,
        program_id: programId,
        week_index: day.weekIndex,
        day_index: day.dayIndex,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,plan_date" },
    );
    if (!error) plansSaved++;
  }

  return { programId, plansSaved };
}

export async function loadActiveProgram(): Promise<StoredTrainingProgram | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data } = await supabase
    .from("training_programs")
    .select(
      "id, user_id, title, primary_goal, experience_level, training_location, weeks_total, current_week, program_json, source, status, started_at, created_at",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    primaryGoal: data.primary_goal,
    experienceLevel: data.experience_level,
    trainingLocation: data.training_location,
    weeksTotal: data.weeks_total,
    currentWeek: data.current_week,
    programJson: data.program_json as StoredTrainingProgram["programJson"],
    source: data.source as StoredTrainingProgram["source"],
    status: data.status as StoredTrainingProgram["status"],
    startedAt: data.started_at,
    createdAt: data.created_at,
  };
}
