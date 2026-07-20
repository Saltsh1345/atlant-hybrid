import type { AtlasMuscleGroup } from "@/types/atlas";
import {
  MUSCLE_MESHES,
  isMuscleMesh,
  normalizeMeshName,
  type MuscleMeshName,
} from "@/lib/three/muscleGroups";

export const ATLAS_MUSCLE_GROUPS: Record<
  AtlasMuscleGroup,
  readonly MuscleMeshName[]
> = {
  chest: ["chest_l", "chest_r"],
  back: ["back_c", "back_l", "back_r"],
  shoulders: ["shoulders_l", "shoulders_r"],
  arms: [
    "biceps_l",
    "biceps_r",
    "triceps_l",
    "triceps_r",
    "forearms_l",
    "forearms_r",
  ],
  core: ["abs_c", "abs_l", "abs_r"],
  glutes: ["glutes_c", "glutes_l", "glutes_r"],
  quads: ["quadriceps_l", "quadriceps_r"],
  hamstrings: ["hamstrings_l", "hamstrings_r"],
  calves: ["calves_l", "calves_r"],
};

export function atlasMuscleName(value: string): MuscleMeshName | null {
  const normalized = normalizeMeshName(value);
  return isMuscleMesh(normalized) ? (normalized as MuscleMeshName) : null;
}

export function atlasGroupMeshes(
  group: AtlasMuscleGroup,
): readonly MuscleMeshName[] {
  return ATLAS_MUSCLE_GROUPS[group];
}

export const ATLAS_ALL_MUSCLES = MUSCLE_MESHES;
