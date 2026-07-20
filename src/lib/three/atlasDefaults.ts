import type {
  AtlasLoadStatus,
  AtlasMode,
  AtlasZoneVisual,
} from "@/types/atlas";

export interface AtlasMaterialPreset {
  color: string;
  emissiveIntensity: number;
  pulse: boolean;
}

const BASE_PRESETS: Record<AtlasLoadStatus, AtlasMaterialPreset> = {
  neutral: { color: "#2b4260", emissiveIntensity: 0.08, pulse: false },
  target: { color: "#77ff39", emissiveIntensity: 0.7, pulse: false },
  fatigue: { color: "#f6c945", emissiveIntensity: 0.65, pulse: false },
  failure: { color: "#ff3b5c", emissiveIntensity: 0.95, pulse: true },
  worked: { color: "#72b7ff", emissiveIntensity: 0.45, pulse: false },
  worked_well: { color: "#a6ff2e", emissiveIntensity: 0.8, pulse: false },
  overloaded: { color: "#ff3b5c", emissiveIntensity: 0.8, pulse: false },
  underworked: { color: "#0c1320", emissiveIntensity: 0, pulse: false },
  not_recovered: { color: "#9f3d4d", emissiveIntensity: 0.35, pulse: false },
};

export function atlasMaterialPreset(
  status: AtlasLoadStatus,
  mode: AtlasMode = "scan",
): AtlasMaterialPreset {
  if (status === "target" && mode === "plan") {
    return { color: "#4a9dff", emissiveIntensity: 0.62, pulse: true };
  }

  if (status === "target" && mode === "scan") {
    return { color: "#48e8ff", emissiveIntensity: 0.45, pulse: false };
  }

  return BASE_PRESETS[status];
}

export function resolveAtlasZoneVisual(
  zone: AtlasZoneVisual,
  mode: AtlasMode = "scan",
): AtlasMaterialPreset {
  const preset = atlasMaterialPreset(zone.status, mode);

  return {
    color: zone.color ?? preset.color,
    emissiveIntensity: zone.emissiveIntensity ?? preset.emissiveIntensity,
    pulse: zone.pulse ?? preset.pulse,
  };
}
