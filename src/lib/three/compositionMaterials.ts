import * as THREE from "three";
import {
  classifyAvatarMesh,
  normalizeMeshName,
} from "@/lib/three/muscleGroups";
import type { FatZoneMap } from "@/types";

const MUSCLE = new THREE.Color("#5eead4");
const MUSCLE_EMISSIVE = new THREE.Color("#2dd4bf");
const MUSCLE_IDLE = new THREE.Color("#7dd3fc");
const MUSCLE_IDLE_EMISSIVE = new THREE.Color("#38bdf8");
const FAT_TINT = new THREE.Color("#fbbf24");
const FAT_EMISSIVE = new THREE.Color("#f59e0b");
const CRITICAL = new THREE.Color("#ef4444");
const CRITICAL_EMISSIVE = new THREE.Color("#f87171");
const SKIN = new THREE.Color("#cbd5e1");
const SKIN_EMISSIVE = new THREE.Color("#94a3b8");

/** Mesh name → fat zone key for Gemini-driven paint. */
const MESH_FAT_ZONE: Record<string, keyof FatZoneMap> = {
  abs_c: "abdomen",
  abs_l: "abdomen",
  abs_r: "abdomen",
  chest_l: "chest",
  chest_r: "chest",
  back_c: "back",
  back_l: "back",
  back_r: "back",
  glutes_c: "hips",
  glutes_l: "hips",
  glutes_r: "hips",
  quadriceps_l: "thighs",
  quadriceps_r: "thighs",
  hamstrings_l: "thighs",
  hamstrings_r: "thighs",
  calves_l: "thighs",
  calves_r: "thighs",
  biceps_l: "arms",
  biceps_r: "arms",
  triceps_l: "arms",
  triceps_r: "arms",
  forearms_l: "arms",
  forearms_r: "arms",
};

function disposeMaterial(mat: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

function setMeshMaterial(
  mesh: THREE.Mesh,
  opts: {
    color: THREE.Color;
    emissive: THREE.Color;
    emissiveIntensity: number;
    opacity?: number;
  }
): void {
  if (mesh.material) disposeMaterial(mesh.material);
  mesh.material = new THREE.MeshStandardMaterial({
    color: opts.color.clone(),
    emissive: opts.emissive.clone(),
    emissiveIntensity: opts.emissiveIntensity,
    roughness: 0.45,
    metalness: 0.1,
    transparent: (opts.opacity ?? 1) < 0.99,
    opacity: opts.opacity ?? 1,
    side: THREE.FrontSide,
    vertexColors: false,
  });
}

function isHeadOrExtremity(name: string): boolean {
  const n = normalizeMeshName(name);
  return (
    n.startsWith("head") ||
    n.startsWith("neck") ||
    n.startsWith("hands") ||
    n.startsWith("feet")
  );
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, t);
}

/** Always hide crude fat_* capsule meshes — paint on muscle groups instead. */
function hideFatCapsules(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (classifyAvatarMesh(mesh.name) === "fat") {
      mesh.visible = false;
    }
  });
}

/** Pre-scan: clean anatomical twin, no fat paint. */
export function applyIdleAnatomicalMaterials(root: THREE.Object3D): void {
  hideFatCapsules(root);
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const kind = classifyAvatarMesh(mesh.name);
    if (kind === "fat") return;

    if (kind === "muscle") {
      const extremity = isHeadOrExtremity(mesh.name);
      setMeshMaterial(mesh, {
        color: extremity ? SKIN : MUSCLE_IDLE,
        emissive: extremity ? SKIN_EMISSIVE : MUSCLE_IDLE_EMISSIVE,
        emissiveIntensity: extremity ? 0.12 : 0.32,
      });
      mesh.visible = true;
      return;
    }
    mesh.visible = false;
  });
}

export function applyScanWireframe(root: THREE.Object3D): void {
  applyIdleAnatomicalMaterials(root);
}

/**
 * After Gemini analysis: paint fat as warm tint on zones Gemini indicated.
 * Never shows fat_arm / fat_leg capsules.
 */
export function applyCompositionVertexMaterials(
  root: THREE.Object3D,
  fatPercent = 22,
  musclePercent = 42,
  fatZones?: FatZoneMap
): void {
  hideFatCapsules(root);
  const muscleBoost = Math.min(1, Math.max(0.25, musclePercent / 55));
  const zones = fatZones ?? {
    abdomen: Math.min(1, fatPercent / 35),
    chest: Math.min(0.4, fatPercent / 50),
    back: Math.min(0.35, fatPercent / 55),
    hips: Math.min(0.7, fatPercent / 40),
    thighs: Math.min(0.45, fatPercent / 45),
    arms: 0.08,
  };

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const kind = classifyAvatarMesh(mesh.name);
    if (kind === "fat") return;

    if (kind !== "muscle") {
      mesh.visible = false;
      return;
    }

    const n = normalizeMeshName(mesh.name);
    const extremity = isHeadOrExtremity(mesh.name);
    const zoneKey = MESH_FAT_ZONE[n];
    // Arms only if Gemini is confident (avoid fake arm fat)
    let fatAmt = zoneKey ? zones[zoneKey] : 0;
    if (zoneKey === "arms" && fatAmt < 0.45) fatAmt = 0;

    if (extremity) {
      setMeshMaterial(mesh, {
        color: SKIN,
        emissive: SKIN_EMISSIVE,
        emissiveIntensity: 0.1,
      });
      mesh.visible = true;
      return;
    }

    const base = MUSCLE.clone();
    const color = lerpColor(base, FAT_TINT, fatAmt * 0.75);
    const emissive = lerpColor(MUSCLE_EMISSIVE, FAT_EMISSIVE, fatAmt);
    setMeshMaterial(mesh, {
      color,
      emissive,
      emissiveIntensity: 0.22 + muscleBoost * 0.35 + fatAmt * 0.55,
    });
    mesh.visible = true;
  });
}

export function applyCriticalMuscleMaterials(
  root: THREE.Object3D,
  criticalMeshes: string[],
  opts?: {
    fatPercent?: number;
    musclePercent?: number;
    compositionKnown?: boolean;
    fatZones?: FatZoneMap;
  }
): void {
  const critical = new Set(criticalMeshes.map((n) => normalizeMeshName(n)));
  if (opts?.compositionKnown) {
    applyCompositionVertexMaterials(
      root,
      opts.fatPercent ?? 22,
      opts.musclePercent ?? 42,
      opts.fatZones
    );
  } else {
    applyIdleAnatomicalMaterials(root);
  }

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!critical.has(normalizeMeshName(mesh.name))) return;
    setMeshMaterial(mesh, {
      color: CRITICAL,
      emissive: CRITICAL_EMISSIVE,
      emissiveIntensity: 0.9,
    });
    mesh.visible = true;
  });
}
