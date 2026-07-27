import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  resolveProgramWeeksFinal,
  suggestProgramWeeks,
} from "@/lib/training/intake/suggestProgramWeeks";
import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";
import type {
  TrainingIntakeAnswers,
  TrainingIntakeRecord,
} from "@/lib/training/intake/types";

export async function saveTrainingIntake(
  answers: TrainingIntakeAnswers,
  bio?: BioScanProfile | null,
): Promise<{ record?: TrainingIntakeRecord; error?: string }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase не сконфигурирован" };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Нужно войти через Google" };

  const suggestion = suggestProgramWeeks(answers, bio);
  const finalWeeks = resolveProgramWeeksFinal(answers, suggestion.weeks);
  const letAi = answers.programWeeksChoice === "ai";

  const payload = {
    user_id: userData.user.id,
    primary_goal: answers.primaryGoal,
    experience_level: answers.experienceLevel,
    training_location: answers.trainingLocation,
    days_per_week: answers.daysPerWeek,
    program_weeks_requested: letAi ? null : answers.programWeeksChoice,
    program_weeks_suggested: suggestion.weeks,
    program_weeks_final: finalWeeks,
    let_ai_suggest_weeks: letAi,
    notes: answers.notes?.trim() || null,
    health_concerns: answers.healthConcerns ?? [],
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_training_intake").upsert(payload, {
    onConflict: "user_id",
  });

  if (error) return { error: error.message };

  return {
    record: {
      ...answers,
      programWeeksSuggested: suggestion.weeks,
      programWeeksFinal: finalWeeks,
      letAiSuggestWeeks: letAi,
      completedAt: payload.completed_at,
    },
  };
}

export { suggestProgramWeeks };
