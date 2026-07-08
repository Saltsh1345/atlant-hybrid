import * as THREE from "three";
import {
  classifyAvatarMesh,
  normalizeMeshName,
} from "@/lib/three/muscleGroups";
import type { FatZoneMap } from "@/types";

/**
 * Reference-matched hologram twin:
 * - Uniform body grid spacing (triplanar on surface — NOT mesh triangle edges)
 * - Soft white-cyan luminous silhouette
 * - Smooth mannequin face
 * Muscle/fat still driven by named meshes + paint amounts.
 */

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

/** Cell size in model meters — ~even spacing like the reference image */
const GRID_CELL = 0.026;
const GRID_LINE = 0.0015;

function disposeMaterial(mat: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

function clearBodyGrid(mesh: THREE.Mesh): void {
  const toRemove: THREE.Object3D[] = [];
  for (const child of mesh.children) {
    if (child.userData?.isBodyGrid) toRemove.push(child);
  }
  for (const child of toRemove) {
    mesh.remove(child);
    const line = child as THREE.LineSegments;
    line.geometry?.dispose();
    const m = line.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  }
}

function isFaceMesh(name: string): boolean {
  const n = normalizeMeshName(name);
  return n.startsWith("head") || n.startsWith("neck");
}

function resolveFatAmt(
  meshName: string,
  fatPercent: number,
  fatZones?: FatZoneMap
): number {
  const n = normalizeMeshName(meshName);
  const zoneKey = MESH_FAT_ZONE[n];
  if (!zoneKey) return 0;
  if (fatZones) {
    let amt = fatZones[zoneKey] ?? 0;
    if (zoneKey === "arms" && amt < 0.45) amt = 0;
    return amt;
  }
  if (fatPercent <= 0) return 0;
  const base = Math.min(0.7, fatPercent / 38);
  if (zoneKey === "abdomen") return base;
  if (zoneKey === "hips") return base * 0.85;
  if (zoneKey === "thighs") return base * 0.55;
  if (zoneKey === "chest" || zoneKey === "back") return base * 0.4;
  return base * 0.25;
}

const hologramVert = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPos = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const hologramFrag = /* glsl */ `
  uniform float uGridCell;
  uniform float uLineWidth;
  uniform float uFace;
  uniform float uFat;
  uniform float uMuscle;
  uniform float uCritical;
  uniform float uTime;

  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;

  float gridLine1D(float x, float cell, float w) {
    float g = abs(fract(x / cell) - 0.5);
    return 1.0 - smoothstep(0.0, w / cell, g);
  }

  // Uniform spaced grid on body surface (triplanar) — spacing independent of triangle edges
  float bodyGrid(vec3 p, vec3 n, float cell, float w) {
    vec3 an = abs(normalize(n));
    float gx = gridLine1D(p.x, cell, w);
    float gy = gridLine1D(p.y, cell, w);
    float gz = gridLine1D(p.z, cell, w);
    // Blend by normal so lines wrap evenly on torso/limbs
    float g = gx * an.x + gy * an.y + gz * an.z;
    // Keep strongest axis contribution for crisp regular look
    float m = max(gx * step(0.45, an.x), max(gy * step(0.45, an.y), gz * step(0.45, an.z)));
    return max(g * 0.65, m);
  }

  void main() {
    vec3 n = normalize(vNormal);
    float fresnel = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.2);

    float cell = mix(uGridCell, uGridCell * 0.85, uFace);
    float lineW = mix(uLineWidth, uLineWidth * 0.7, uFace);
    float grid = bodyGrid(vPos, n, cell, lineW);

    // Base luminous fill — soft white-cyan like reference (figure is the light)
    vec3 core = mix(vec3(0.55, 0.82, 0.98), vec3(0.92, 0.97, 1.0), 0.55);
    vec3 rim = vec3(0.75, 0.92, 1.0);

    // Muscle % → brighter cyan core
    core = mix(core, vec3(0.35, 0.85, 1.0), uMuscle * 0.35);
    // Fat % → warm amber shift (still hologram)
    core = mix(core, vec3(1.0, 0.78, 0.35), uFat * 0.55);
    rim = mix(rim, vec3(1.0, 0.9, 0.55), uFat * 0.4);

    if (uCritical > 0.5) {
      core = vec3(1.0, 0.35, 0.35);
      rim = vec3(1.0, 0.65, 0.65);
    }

    // Face: smoother mannequin — softer grid, more fill glow
    float faceSoft = uFace;
    float gridAmt = mix(grid, grid * 0.55, faceSoft);

    float pulse = 0.97 + 0.03 * sin(uTime * 1.6);
    vec3 col = core * (0.55 + 0.25 * fresnel) * pulse;
    col += rim * fresnel * 0.85;
    col += vec3(0.65, 0.9, 1.0) * gridAmt * mix(0.95, 0.45, faceSoft);

    // Soft body opacity — denser at rim, translucent center like hologram scan
    float alpha = mix(0.42, 0.78, fresnel) + gridAmt * 0.35;
    alpha = mix(alpha, 0.55 + fresnel * 0.3 + gridAmt * 0.2, faceSoft);
    alpha = clamp(alpha, 0.35, 0.92);

    gl_FragColor = vec4(col, alpha);
  }
`;

function makeHologramMaterial(opts: {
  face: boolean;
  fatAmt: number;
  muscleBoost: number;
  critical: boolean;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGridCell: { value: GRID_CELL },
      uLineWidth: { value: GRID_LINE },
      uFace: { value: opts.face ? 1 : 0 },
      uFat: { value: opts.fatAmt },
      uMuscle: { value: opts.muscleBoost },
      uCritical: { value: opts.critical ? 1 : 0 },
      uTime: { value: 0 },
    },
    vertexShader: hologramVert,
    fragmentShader: hologramFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Animate subtle hologram pulse — call from useFrame if materials collected */
export function tickHologramMaterials(
  root: THREE.Object3D,
  elapsed: number
): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.ShaderMaterial;
    if (mat?.isShaderMaterial && mat.uniforms?.uTime) {
      mat.uniforms.uTime.value = elapsed;
    }
  });
}

function paintHologramPiece(
  mesh: THREE.Mesh,
  opts: {
    face?: boolean;
    fatAmt?: number;
    muscleBoost?: number;
    critical?: boolean;
  }
): void {
  clearBodyGrid(mesh);
  if (mesh.material) disposeMaterial(mesh.material);
  mesh.material = makeHologramMaterial({
    face: !!opts.face,
    fatAmt: opts.fatAmt ?? 0,
    muscleBoost: opts.muscleBoost ?? 0.5,
    critical: !!opts.critical,
  });
  mesh.visible = true;
  mesh.renderOrder = opts.face ? 1 : 0;
}

function hideFatCapsules(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (classifyAvatarMesh(mesh.name) === "fat") {
      mesh.visible = false;
      clearBodyGrid(mesh);
    }
  });
}

export function applyHologramTwinMaterials(
  root: THREE.Object3D,
  opts?: {
    fatPercent?: number;
    musclePercent?: number;
    fatZones?: FatZoneMap;
  }
): void {
  hideFatCapsules(root);
  const fatPercent = opts?.fatPercent ?? 0;
  const musclePercent = opts?.musclePercent ?? 42;
  const muscleBoost = Math.min(1, Math.max(0.25, musclePercent / 55));

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const kind = classifyAvatarMesh(mesh.name);
    if (kind === "fat") return;
    if (kind !== "muscle") {
      mesh.visible = false;
      clearBodyGrid(mesh);
      return;
    }

    paintHologramPiece(mesh, {
      face: isFaceMesh(mesh.name),
      fatAmt: resolveFatAmt(mesh.name, fatPercent, opts?.fatZones),
      muscleBoost,
    });
  });
}

export function applyCalmReadableMaterials(root: THREE.Object3D): void {
  applyHologramTwinMaterials(root);
}

export function applyIdleAnatomicalMaterials(
  root: THREE.Object3D,
  _opts?: { bodyGrid?: boolean }
): void {
  applyHologramTwinMaterials(root);
}

export function applyScanWireframe(root: THREE.Object3D): void {
  applyHologramTwinMaterials(root);
}

export function applyCompositionVertexMaterials(
  root: THREE.Object3D,
  fatPercent = 22,
  musclePercent = 42,
  fatZones?: FatZoneMap,
  _opts?: { bodyGrid?: boolean }
): void {
  const zones = fatZones ?? {
    abdomen: Math.min(1, fatPercent / 35),
    chest: Math.min(0.4, fatPercent / 50),
    back: Math.min(0.35, fatPercent / 55),
    hips: Math.min(0.7, fatPercent / 40),
    thighs: Math.min(0.45, fatPercent / 45),
    arms: 0.08,
  };
  applyHologramTwinMaterials(root, {
    fatPercent,
    musclePercent,
    fatZones: zones,
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
    bodyGrid?: boolean;
  }
): void {
  const critical = new Set(criticalMeshes.map((n) => normalizeMeshName(n)));

  applyHologramTwinMaterials(root, {
    fatPercent: opts?.compositionKnown
      ? (opts.fatPercent ?? 22)
      : opts?.fatPercent,
    musclePercent: opts?.musclePercent ?? 42,
    fatZones: opts?.fatZones,
  });

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!critical.has(normalizeMeshName(mesh.name))) return;
    paintHologramPiece(mesh, {
      face: isFaceMesh(mesh.name),
      critical: true,
      muscleBoost: 1,
    });
  });
}
