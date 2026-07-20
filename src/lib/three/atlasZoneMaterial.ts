import * as THREE from "three";
import type { AtlasMode, AtlasZoneVisual } from "@/types/atlas";
import { atlasMuscleName } from "@/lib/three/atlasMuscleMap";
import { resolveAtlasZoneVisual } from "@/lib/three/atlasDefaults";

export interface AtlasPulseMaterial {
  material: THREE.MeshStandardMaterial;
  baseIntensity: number;
}

export function atlasZoneMap(zones: AtlasZoneVisual[]) {
  return new Map(zones.map((zone) => [zone.zone, zone]));
}

export function createAtlasMeshMaterial(
  meshName: string,
  zones: Map<string, AtlasZoneVisual>,
  mode: AtlasMode,
  selectedZone: string | null | undefined,
): { material: THREE.MeshStandardMaterial; pulse: AtlasPulseMaterial | null } {
  const zone = atlasMuscleName(meshName);
  const visual = zone ? zones.get(zone) : undefined;
  const preset = visual
    ? resolveAtlasZoneVisual(visual, mode)
    : resolveAtlasZoneVisual({ zone: "abs_c", status: "neutral" }, mode);
  const selected = zone != null && zone === selectedZone;
  const material = new THREE.MeshStandardMaterial({
    color: preset.color,
    emissive: new THREE.Color(preset.color),
    emissiveIntensity: selected
      ? Math.max(preset.emissiveIntensity, 0.9)
      : preset.emissiveIntensity,
    roughness: 0.62,
    metalness: 0.12,
  });

  return {
    material,
    pulse: preset.pulse
      ? { material, baseIntensity: material.emissiveIntensity }
      : null,
  };
}

export function disposeAtlasMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => material.dispose());
  });
}
