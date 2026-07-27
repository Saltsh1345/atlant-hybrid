import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { TrainingIntakeRecord, HealthConcernId } from "@/lib/training/intake/types";

interface IntakeRow {
  primary_goal: string;
  experience_level: string;
  training_location: string;
  days_per_week: number;
  program_weeks_requested: number | null;
  program_weeks_suggested: number;
  program_weeks_final: number;
  let_ai_suggest_weeks: boolean;
  notes: string | null;
  health_concerns?: HealthConcernId[] | null;
  completed_at: string;
}

function rowToRecord(row: IntakeRow): TrainingIntakeRecord {
  return {
    primaryGoal: row.primary_goal as TrainingIntakeRecord["primaryGoal"],
    experienceLevel: row.experience_level as TrainingIntakeRecord["experienceLevel"],
    trainingLocation: row.training_location as TrainingIntakeRecord["trainingLocation"],
    daysPerWeek: row.days_per_week,
    programWeeksChoice: row.let_ai_suggest_weeks
      ? "ai"
      : (row.program_weeks_requested as TrainingIntakeRecord["programWeeksChoice"]),
    healthConcerns: (row.health_concerns ?? []) as HealthConcernId[],
    notes: row.notes ?? undefined,
    programWeeksSuggested: row.program_weeks_suggested,
    programWeeksFinal: row.program_weeks_final,
    letAiSuggestWeeks: row.let_ai_suggest_weeks,
    completedAt: row.completed_at,
  };
}

export async function loadTrainingIntake(): Promise<TrainingIntakeRecord | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("user_training_intake")
    .select(
      "primary_goal, experience_level, training_location, days_per_week, program_weeks_requested, program_weeks_suggested, program_weeks_final, let_ai_suggest_weeks, notes, health_concerns, completed_at",
    )
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToRecord(data as IntakeRow);
}
