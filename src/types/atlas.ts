import type { MuscleMeshName } from "@/lib/three/muscleGroups";

export type AtlasMuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type AtlasLoadStatus =
  | "neutral"
  | "target"
  | "fatigue"
  | "failure"
  | "worked"
  | "worked_well"
  | "overloaded"
  | "underworked"
  | "not_recovered";

export type AtlasMode = "live" | "post_workout" | "plan" | "scan";

export interface AtlasZoneVisual {
  zone: MuscleMeshName;
  status: AtlasLoadStatus;
  color?: string;
  emissiveIntensity?: number;
  pulse?: boolean;
}

export interface AtlasVisualizationInput {
  zones: AtlasZoneVisual[];
  selectedZone?: MuscleMeshName | null;
  mode?: AtlasMode;
}
