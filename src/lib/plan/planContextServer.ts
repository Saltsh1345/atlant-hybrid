import type { SupabaseClient } from "@supabase/supabase-js";
import { loadTrainingIntakeServer } from "@/lib/training/intake/loadTrainingIntakeServer";
import { goalToLegacyFitnessGoal } from "@/lib/training/intake/suggestProgramWeeks";
import { buildBioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";
import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";
import type { StageTwoScanResult } from "@/lib/scan/scanResult";
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
  captured_at: string;
  quality_score: number;
  result: StageTwoScanResult;
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

/** Серверная загрузка контекста для Route Handlers. */
export async function loadPlanContextServer(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedPlanContext | null> {
  const [profileRes, scanRes, sessionsRes, intake] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "height_cm, weight_kg, age, body_fat_percentage, hyperlordosis_likely, scan_anthropometrics",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("body_scans")
      .select("captured_at, quality_score, result")
      .eq("user_id", userId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id, completed_at, sport, exercise, duration_sec, form_score")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(10),
    loadTrainingIntakeServer(supabase, userId),
  ]);

  const profile = (profileRes.data ?? null) as ProfileContextRow | null;
  const sessionRows = (sessionsRes.data ?? []) as WorkoutSessionRow[];

  const recentSessions: PlanSessionRow[] = sessionRows.map((row) => ({
    id: row.id,
    completedAt: row.completed_at,
    sport: row.sport,
    exercise: row.exercise,
    durationSec: row.duration_sec,
    formScore: row.form_score,
  }));

  const scanRow = (scanRes.data ?? null) as BodyScanContextRow | null;
  const scanResult = scanRow?.result ?? null;
  const bioScan: BioScanProfile = buildBioScanProfile({
    scanResult,
    bodyFatPercent: profile?.body_fat_percentage ?? null,
  });

  const readinessGroups = computePlanRecovery(recentSessions);
  const trainingIntake = intake ?? null;

  return {
    userId,
    context: {
      heightCm: profile?.height_cm ?? null,
      weightKg: profile?.weight_kg ?? null,
      age: profile?.age ?? null,
      bodyFatPercentage: profile?.body_fat_percentage ?? null,
      hyperlordosisLikely:
        bioScan.hyperlordosisLikely ?? profile?.hyperlordosis_likely ?? null,
      anthropometrics:
        (scanResult?.anthropometrics ??
          profile?.scan_anthropometrics ??
          null) as Record<string, unknown> | null,
      posture: (scanResult?.posture ?? null) as Record<string, unknown> | null,
      bioScan,
      goal: trainingIntake
        ? goalToLegacyFitnessGoal(trainingIntake.primaryGoal)
        : null,
      trainingIntake,
      recentSessions,
      readinessGroups,
      readinessOverall: overallRecovery(readinessGroups),
    },
  };
}
