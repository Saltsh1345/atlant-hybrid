import type { AtlasZoneVisual } from "@/types/atlas";
import { atlasMuscleName } from "@/lib/three/atlasMuscleMap";

export function buildWorkoutAtlasZones(
  targetMeshes: string[],
  fatiguePercent: number,
  failed: boolean,
): AtlasZoneVisual[] {
  const status = failed
    ? "failure"
    : fatiguePercent > 0
      ? "fatigue"
      : "target";

  return Array.from(
    new Set(
      targetMeshes
        .map((mesh) => atlasMuscleName(mesh))
        .filter((mesh): mesh is NonNullable<typeof mesh> => mesh !== null),
    ),
  ).map((zone) => ({ zone, status }));
}
