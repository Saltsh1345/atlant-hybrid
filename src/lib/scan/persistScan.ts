import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { StageTwoScanResult } from "@/lib/scan/scanResult";

export async function saveStatureToProfile(statureCm: number) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error("supabase_not_configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("authentication_required");

  const { error } = await supabase
    .from("profiles")
    .update({
      height_cm: statureCm,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw error;
  return user;
}

export async function persistBodyScan(result: StageTwoScanResult) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error("supabase_not_configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("authentication_required");

  const { data, error } = await supabase
    .from("body_scans")
    .insert({
      user_id: user.id,
      captured_at: result.capturedAt,
      stature_cm: result.statureCm,
      hyperlordosis_likely: result.hyperlordosisLikely,
      posture_confidence: result.posture?.confidence ?? null,
      quality_score: result.quality.score,
      result,
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      height_cm: result.statureCm,
      latest_scan_at: result.capturedAt,
      hyperlordosis_likely: result.hyperlordosisLikely,
      scan_anthropometrics: result.anthropometrics,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) throw profileError;
  return data.id as string;
}
