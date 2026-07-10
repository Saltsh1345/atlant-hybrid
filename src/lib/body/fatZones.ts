import type { FatZoneMap } from "@/types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Default fat zone intensities from total body-fat %. */
export function defaultFatZones(fatPercent: number): FatZoneMap {
  const t = clamp01((fatPercent - 10) / 28);
  return {
    abdomen: clamp01(0.35 + t * 0.55),
    chest: clamp01(0.15 + t * 0.25),
    back: clamp01(0.12 + t * 0.2),
    hips: clamp01(0.2 + t * 0.35),
    thighs: clamp01(0.1 + t * 0.25),
    arms: 0,
  };
}

/** Zones from fat % when scan did not return per-zone data. */
export function fatZonesFromPercent(
  fatPercent: number,
  fatZones?: FatZoneMap
): FatZoneMap {
  if (fatZones) return fatZones;
  return defaultFatZones(fatPercent);
}
