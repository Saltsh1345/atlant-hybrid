import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export interface WorkoutProfile {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
}

/** Read-only profile data used by the workout HUD and VBT context. */
export async function loadWorkoutProfile(): Promise<WorkoutProfile | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return null;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("height_cm, weight_kg, age")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (error || !data) return null;

    return {
      heightCm: Number.isFinite(Number(data.height_cm))
        ? Number(data.height_cm)
        : null,
      weightKg: Number.isFinite(Number(data.weight_kg))
        ? Number(data.weight_kg)
        : null,
      age: Number.isFinite(Number(data.age)) ? Number(data.age) : null,
    };
  } catch {
    // A transient Supabase/auth network error must not block the live camera.
    return null;
  }
}
