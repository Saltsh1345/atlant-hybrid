import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { WorkoutMetrics } from "@/lib/workout/types";

export async function persistWorkoutSession({
  durationSec,
  metrics,
}: {
  durationSec: number;
  metrics: WorkoutMetrics;
}): Promise<{ error?: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return { error: "Supabase не сконфигурирован" };
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: "Нужно войти через Google" };

    const { error } = await supabase.from("workout_sessions").insert({
      user_id: userData.user.id,
      completed_at: new Date().toISOString(),
      sport: "strength",
      exercise: "squat",
      duration_sec: durationSec,
      avg_velocity: metrics.verticalVelocityMs,
      peak_velocity: metrics.peakVelocityMs,
      reps: metrics.repetitions,
      summary: {
        verticalVelocityMs: metrics.verticalVelocityMs,
        peakVelocityMs: metrics.peakVelocityMs,
        baselineVelocityMs: metrics.baselineVelocityMs,
        fatiguePercent: metrics.fatiguePercent,
        failed: metrics.failed,
      },
    });
    return error ? { error: error.message } : {};
  } catch {
    return { error: "Не удалось сохранить тренировку" };
  }
}
