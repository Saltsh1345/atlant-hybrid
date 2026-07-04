import type { SessionSummary, Sport, StrengthExercise } from "@/types";

/** Mesh names present in public/avatar.glb (anatomical multi-mesh, no skeleton). */
export const MUSCLE_MESHES = [
  "abs_c",
  "abs_l",
  "abs_r",
  "back_c",
  "back_l",
  "back_r",
  "biceps_l",
  "biceps_r",
  "calves_l",
  "calves_r",
  "chest_l",
  "chest_r",
  "feet_c",
  "feet_l",
  "feet_r",
  "forearms_l",
  "forearms_r",
  "glutes_c",
  "glutes_l",
  "glutes_r",
  "hamstrings_l",
  "hamstrings_r",
  "hands_l",
  "hands_r",
  "head_l",
  "head_r",
  "head_skullcap_c",
  "neck_l",
  "neck_r",
  "quadriceps_l",
  "quadriceps_r",
  "shoulders_l",
  "shoulders_r",
  "triceps_l",
  "triceps_r",
] as const;

export const FAT_MESHES = [
  "fat_torso",
  "fat_arm_l",
  "fat_arm_r",
  "fat_leg_l",
  "fat_leg_r",
] as const;

export type MuscleMeshName = (typeof MUSCLE_MESHES)[number];
export type FatMeshName = (typeof FAT_MESHES)[number];
export type AvatarMeshKind = "muscle" | "fat" | "other";

export function normalizeMeshName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function classifyAvatarMesh(name: string): AvatarMeshKind {
  const n = normalizeMeshName(name);
  if (n.startsWith("fat_")) return "fat";
  if ((MUSCLE_MESHES as readonly string[]).includes(n)) return "muscle";
  return "other";
}

export function isFatMesh(name: string): boolean {
  return classifyAvatarMesh(name) === "fat";
}

export function isMuscleMesh(name: string): boolean {
  return classifyAvatarMesh(name) === "muscle";
}

/** Primary movers stressed by each sport / exercise. */
const SPORT_MUSCLES: Record<Sport, string[]> = {
  strength: [
    "quadriceps_l",
    "quadriceps_r",
    "glutes_c",
    "glutes_l",
    "glutes_r",
    "hamstrings_l",
    "hamstrings_r",
    "back_c",
    "back_l",
    "back_r",
    "abs_c",
  ],
  boxing: [
    "shoulders_l",
    "shoulders_r",
    "biceps_l",
    "biceps_r",
    "triceps_l",
    "triceps_r",
    "forearms_l",
    "forearms_r",
    "abs_c",
    "abs_l",
    "abs_r",
    "back_c",
    "chest_l",
    "chest_r",
  ],
  tennis: [
    "shoulders_l",
    "shoulders_r",
    "forearms_l",
    "forearms_r",
    "back_c",
    "back_l",
    "back_r",
    "abs_c",
    "abs_l",
    "abs_r",
    "chest_l",
    "chest_r",
  ],
};

const EXERCISE_MUSCLES: Record<StrengthExercise, string[]> = {
  squat: [
    "quadriceps_l",
    "quadriceps_r",
    "glutes_c",
    "glutes_l",
    "glutes_r",
    "hamstrings_l",
    "hamstrings_r",
    "back_c",
    "back_l",
    "back_r",
    "calves_l",
    "calves_r",
  ],
  bench: [
    "chest_l",
    "chest_r",
    "shoulders_l",
    "shoulders_r",
    "triceps_l",
    "triceps_r",
    "back_c",
  ],
  lunge: [
    "quadriceps_l",
    "quadriceps_r",
    "glutes_l",
    "glutes_r",
    "hamstrings_l",
    "hamstrings_r",
    "calves_l",
    "calves_r",
    "abs_c",
  ],
};

/**
 * Muscles in critical state after poor technique.
 * formScore < 55 → full primary set; 55–69 → half set.
 */
export function criticalMusclesFromSession(
  session: Pick<SessionSummary, "sport" | "exercise" | "formScore"> | null
): string[] {
  if (!session) return [];
  const score = session.formScore ?? 0;
  if (score <= 0 || score >= 70) return [];

  const base =
    session.sport === "strength" && session.exercise
      ? EXERCISE_MUSCLES[session.exercise]
      : SPORT_MUSCLES[session.sport];

  if (score < 55) return [...base];
  return base.filter((_, i) => i % 2 === 0);
}

export function criticalMusclesFromLive(
  sport: Sport,
  exercise: StrengthExercise | null | undefined,
  formScore: number
): string[] {
  return criticalMusclesFromSession({
    sport,
    exercise: exercise ?? undefined,
    formScore,
  });
}
