import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  resolveProgramWeeksFinal,
  suggestProgramWeeks,
} from "@/lib/training/intake/suggestProgramWeeks";
import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";
import {
  encodeNotesWithHealth,
  isHealthConcernsSchemaError,
} from "@/lib/training/intake/healthConcernsCodec";
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
  const completedAt = new Date().toISOString();

  const base = {
    user_id: userData.user.id,
    primary_goal: answers.primaryGoal,
    experience_level: answers.experienceLevel,
    training_location: answers.trainingLocation,
    days_per_week: answers.daysPerWeek,
    program_weeks_requested: letAi ? null : answers.programWeeksChoice,
    program_weeks_suggested: suggestion.weeks,
    program_weeks_final: finalWeeks,
    let_ai_suggest_weeks: letAi,
    updated_at: completedAt,
    completed_at: completedAt,
  };

  let { error } = await supabase.from("user_training_intake").upsert(
    {
      ...base,
      notes: answers.notes?.trim() || null,
      health_concerns: answers.healthConcerns ?? [],
    },
    { onConflict: "user_id" },
  );

  if (error && isHealthConcernsSchemaError(error.message)) {
    ({ error } = await supabase.from("user_training_intake").upsert(
      {
        ...base,
        notes: encodeNotesWithHealth(answers.healthConcerns, answers.notes),
      },
      { onConflict: "user_id" },
    ));
  }

  if (error) return { error: error.message };

  return {
    record: {
      ...answers,
      programWeeksSuggested: suggestion.weeks,
      programWeeksFinal: finalWeeks,
      letAiSuggestWeeks: letAi,
      completedAt,
    },
  };
}

export { suggestProgramWeeks };
