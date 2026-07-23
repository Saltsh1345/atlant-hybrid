import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { PlanGenerationContext, PlanSessionRow } from "@/lib/plan/types";
import {
  computePlanRecovery,
  overallRecovery,
} from "@/lib/plan/readinessToAtlas";

interface ProfileContextRow {
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  body_fat_percentage: number | null;
  hyperlordosis_likely: boolean | null;
  scan_anthropometrics: Record<string, unknown> | null;
}

interface BodyScanContextRow {
  result: { posture?: Record<string, unknown> | null } | null;
}

interface WorkoutSessionRow {
  id: string;
  completed_at: string;
  sport: string;
  exercise: string | null;
  duration_sec: number;
  form_score: number | null;
}

export interface LoadedPlanContext {
  userId: string;
  context: PlanGenerationContext;
}

/**
 * Читает контекст пользователя для генерации плана:
 * профиль (рост/вес/осанка/антропометрия), последний скан и историю тренировок.
 */
export async function loadPlanContext(): Promise<LoadedPlanContext | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const [profileRes, scanRes, sessionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "height_cm, weight_kg, age, body_fat_percentage, hyperlordosis_likely, scan_anthropometrics",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("body_scans")
      .select("result")
      .eq("user_id", user.id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id, completed_at, sport, exercise, duration_sec, form_score")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  const profile = (profileRes.data ?? null) as ProfileContextRow | null;
  const scan = (scanRes.data ?? null) as BodyScanContextRow | null;
  const sessionRows = (sessionsRes.data ?? []) as WorkoutSessionRow[];

  const recentSessions: PlanSessionRow[] = sessionRows.map((row) => ({
    id: row.id,
    completedAt: row.completed_at,
    sport: row.sport,
    exercise: row.exercise,
    durationSec: row.duration_sec,
    formScore: row.form_score,
  }));

  const readinessGroups = computePlanRecovery(recentSessions);

  return {
    userId: user.id,
    context: {
      heightCm: profile?.height_cm ?? null,
      weightKg: profile?.weight_kg ?? null,
      age: profile?.age ?? null,
      bodyFatPercentage: profile?.body_fat_percentage ?? null,
      hyperlordosisLikely: profile?.hyperlordosis_likely ?? null,
      anthropometrics: profile?.scan_anthropometrics ?? null,
      posture: scan?.result?.posture ?? null,
      goal: null,
      recentSessions,
      readinessGroups,
      readinessOverall: overallRecovery(readinessGroups),
    },
  };
}
