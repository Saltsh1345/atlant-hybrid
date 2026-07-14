import * as THREE from "three";
import { fatZonesFromPercent } from "@/lib/body/fatZones";
import {
  classifyAvatarMesh,
  normalizeMeshName,
} from "@/lib/three/muscleGroups";
import type { FatZoneMap } from "@/types";

/**
 * Body-composition hologram twin
 * --------------------------------------------------------------
 * Fat: soft peach / amber wash on abdomen, hips, thighs, chest —
 *      scaled by fatZones. Never solid orange blobs / fat_* meshes.
 * Muscle: cooler cyan + stronger rim / grid on primary movers,
 *         intensity scales with muscle %.
 * Neutral: no latched scan → even mannequin, no fake composition paint.
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

/** Relative muscle-definition weight for named groups (0–1). */
const MESH_MUSCLE_DEF: Record<string, number> = {
  abs_c: 1,
  abs_l: 0.95,
  abs_r: 0.95,
  chest_l: 1,
  chest_r: 1,
  shoulders_l: 0.95,
  shoulders_r: 0.95,
  biceps_l: 0.9,
  biceps_r: 0.9,
  triceps_l: 0.85,
  triceps_r: 0.85,
  quadriceps_l: 0.95,
  quadriceps_r: 0.95,
  glutes_c: 0.85,
  glutes_l: 0.8,
  glutes_r: 0.8,
  hamstrings_l: 0.8,
  hamstrings_r: 0.8,
  back_c: 0.9,
  back_l: 0.85,
  back_r: 0.85,
  calves_l: 0.7,
  calves_r: 0.7,
  forearms_l: 0.55,
  forearms_r: 0.55,
};

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

function fatZoneKey(meshName: string): keyof FatZoneMap | undefined {
  return MESH_FAT_ZONE[normalizeMeshName(meshName)];
}

/**
 * Soft fat amount for a muscle mesh. Arms stay near-zero so limbs
 * don't read as "fat blobs". Returns 0 when composition is unknown.
 */
function resolveFatAmt(
  meshName: string,
  fatPercent: number,
  fatZones?: FatZoneMap,
  compositionKnown = true
): number {
  if (!compositionKnown || fatPercent <= 0) return 0;
  const n = normalizeMeshName(meshName);
  const zoneKey = MESH_FAT_ZONE[n];
  if (!zoneKey) return 0;
  if (zoneKey === "arms") return 0;

  const zoneAmt = fatZones?.[zoneKey];
  if (zoneAmt != null) {
    // Soft curve — keep mid/high fat readable without clipping to solid paint
    return Math.min(0.92, Math.pow(Math.max(0, zoneAmt), 0.9));
  }

  const base = Math.min(0.75, fatPercent / 36);
  if (zoneKey === "abdomen") return base;
  if (zoneKey === "hips") return base * 0.8;
  if (zoneKey === "thighs") return base * 0.5;
  if (zoneKey === "chest" || zoneKey === "back") return base * 0.35;
  return 0;
}

function resolveMuscleDef(meshName: string, muscleBoost: number): number {
  const n = normalizeMeshName(meshName);
  if (isFaceMesh(n)) return muscleBoost * 0.2;
  const local = MESH_MUSCLE_DEF[n] ?? 0.35;
  return Math.min(1, muscleBoost * (0.45 + local * 0.55));
}

/** Abdomen/hips get a soft "primary depot" flag (shader uses as boost, not binary paint). */
function isPrimaryFatDepot(zoneKey: keyof FatZoneMap | undefined): boolean {
  return zoneKey === "abdomen" || zoneKey === "hips";
}

const hologramVert = /* glsl */ `
  uniform float uFat;
  uniform float uFatDepot;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Soft volume cue: slightly expand high-fat depot meshes along normals
    float inflate = uFat * mix(0.004, 0.011, uFatDepot);
    vec3 pos = position + normal * inflate;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vPos = pos;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const hologramFrag = /* glsl */ `
  uniform float uGridCell;
  uniform float uLineWidth;
  uniform float uFace;
  uniform float uFat;
  uniform float uFatDepot;
  uniform float uMuscle;
  uniform float uCritical;
  uniform float uGhost;
  uniform float uComposition;
  uniform float uTime;

  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;

  float gridLine1D(float x, float cell, float w) {
    float g = abs(fract(x / cell) - 0.5);
    return 1.0 - smoothstep(0.0, w / cell, g);
  }

  float bodyGrid(vec3 p, vec3 n, float cell, float w) {
    vec3 an = abs(normalize(n));
    float gx = gridLine1D(p.x, cell, w);
    float gy = gridLine1D(p.y, cell, w);
    float gz = gridLine1D(p.z, cell, w);
    float g = gx * an.x + gy * an.y + gz * an.z;
    float m = max(gx * step(0.45, an.x), max(gy * step(0.45, an.y), gz * step(0.45, an.z)));
    return max(g * 0.65, m);
  }

  void main() {
    vec3 n = normalize(vNormal);
    float fresnel = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.15);

    float cell = mix(uGridCell, uGridCell * 0.85, uFace);
    float lineW = mix(uLineWidth, uLineWidth * 0.7, uFace);
    float grid = bodyGrid(vPos, n, cell, lineW);

    // Neutral luminous mannequin — soft cool cyan-white
    vec3 core = mix(vec3(0.52, 0.78, 0.94), vec3(0.90, 0.96, 1.0), 0.52);
    vec3 rim = vec3(0.72, 0.90, 1.0);

    // Muscle definition: cooler core + tighter rim/grid on primary movers
    float m = clamp(uMuscle, 0.0, 1.0);
    core = mix(core, vec3(0.22, 0.78, 0.98), m * 0.48);
    rim = mix(rim, vec3(0.45, 0.92, 1.0), m * 0.55);
    float gridAmt = mix(grid, grid * 0.55, uFace);
    gridAmt *= (1.0 + m * 0.42);

    if (uCritical > 0.5) {
      if (uGhost > 0.5) {
        core = mix(core, vec3(1.0, 0.55, 0.28), 0.45);
        rim = vec3(1.0, 0.75, 0.4);
      } else {
        core = vec3(1.0, 0.38, 0.38);
        rim = vec3(1.0, 0.68, 0.68);
      }
    }

    float pulse = 0.975 + 0.025 * sin(uTime * 1.5);

    // Fat: soft peach/amber wash — proportional, never solid orange fill
    if (uComposition > 0.5 && uFat > 0.04) {
      float fatSoft = smoothstep(0.04, 0.88, uFat);
      // Depot regions (belly/hips) get a bit more warmth; still translucent
      float warmth = fatSoft * mix(0.16, 0.34, uFatDepot);
      // Vertical bias: lower part of mesh slightly warmer (soft belly cue)
      float yBias = smoothstep(0.35, -0.55, vPos.y) * 0.12 * uFatDepot;
      warmth = clamp(warmth + yBias, 0.0, 0.42);
      vec3 fatCol = vec3(0.98, 0.74, 0.48); // peach, not neon orange
      vec3 fatRim = vec3(1.0, 0.82, 0.55);
      core = mix(core, fatCol, warmth);
      rim = mix(rim, fatRim, warmth * 0.55);
      // Fat softens muscle grid slightly so depot reads as softer tissue
      gridAmt *= (1.0 - warmth * 0.35);
    }

    vec3 col = core * (0.52 + 0.28 * fresnel) * pulse;
    col += rim * fresnel * (0.78 + m * 0.5);
    col += vec3(0.62, 0.88, 1.0) * gridAmt * mix(0.92, 0.42, uFace);

    float alpha = mix(0.40, 0.80, fresnel) + gridAmt * 0.32 + m * 0.06;
    alpha = mix(alpha, 0.52 + fresnel * 0.28 + gridAmt * 0.18, uFace);

    if (uGhost > 0.5) {
      col = mix(vec3(0.16, 0.48, 0.68), col, 0.30 + gridAmt * 0.4);
      col += vec3(0.42, 0.80, 1.0) * gridAmt * 0.5;
      alpha = mix(0.1, 0.36, gridAmt + fresnel * 0.25);
      alpha = clamp(alpha, 0.08, 0.42);
    } else {
      alpha = clamp(alpha, 0.34, 0.93);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

function makeHologramMaterial(opts: {
  face: boolean;
  fatAmt: number;
  fatDepot: boolean;
  muscleBoost: number;
  critical: boolean;
  ghost?: boolean;
  compositionKnown?: boolean;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGridCell: { value: opts.ghost ? GRID_CELL * 0.92 : GRID_CELL },
      uLineWidth: { value: opts.ghost ? GRID_LINE * 0.85 : GRID_LINE },
      uFace: { value: opts.face ? 1 : 0 },
      uFat: { value: opts.fatAmt },
      uFatDepot: { value: opts.fatDepot ? 1 : 0 },
      uMuscle: { value: opts.muscleBoost },
      uCritical: { value: opts.critical ? 1 : 0 },
      uGhost: { value: opts.ghost ? 1 : 0 },
      uComposition: { value: opts.compositionKnown ? 1 : 0 },
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
    if (!mat?.isShaderMaterial) return;
    if (mat.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
  });
}

function paintHologramPiece(
  mesh: THREE.Mesh,
  opts: {
    face?: boolean;
    fatAmt?: number;
    muscleBoost?: number;
    critical?: boolean;
    ghost?: boolean;
    compositionKnown?: boolean;
  }
): void {
  clearBodyGrid(mesh);
  if (mesh.material) disposeMaterial(mesh.material);
  const fatAmt = opts.fatAmt ?? 0;
  const zone = fatZoneKey(mesh.name);
  const depot = isPrimaryFatDepot(zone) && fatAmt >= 0.18;
  mesh.material = makeHologramMaterial({
    face: !!opts.face,
    fatAmt,
    fatDepot: depot,
    muscleBoost: opts.muscleBoost ?? 0.5,
    critical: !!opts.critical,
    ghost: opts.ghost,
    compositionKnown: opts.compositionKnown,
  });
  mesh.visible = true;
  mesh.renderOrder = depot ? 2 : opts.face ? 1 : 0;
}

/** Capsule fat_* meshes look like orange blobs — always hide. */
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
    ghost?: boolean;
    /** When false/undefined, paint neutral twin (no fat warmth, moderate muscle). */
    compositionKnown?: boolean;
  }
): void {
  const compositionKnown = opts?.compositionKnown === true;
  const fatPercent = compositionKnown ? (opts?.fatPercent ?? 0) : 0;
  const musclePercent = compositionKnown
    ? (opts?.musclePercent ?? 42)
    : 40;
  // Neutral: mild definition; known scan: scale 28–58% muscle → ~0.35–1.0
  const muscleBoost = compositionKnown
    ? Math.min(1, Math.max(0.28, (musclePercent - 22) / 36))
    : 0.42;
  const zones = compositionKnown
    ? fatZonesFromPercent(fatPercent, opts?.fatZones)
    : undefined;

  hideFatCapsules(root);

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
      fatAmt: resolveFatAmt(mesh.name, fatPercent, zones, compositionKnown),
      muscleBoost: resolveMuscleDef(mesh.name, muscleBoost),
      ghost: opts?.ghost,
      compositionKnown,
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
  _opts?: { bodyGrid?: boolean; ghost?: boolean }
): void {
  const zones = fatZonesFromPercent(fatPercent, fatZones);
  applyHologramTwinMaterials(root, {
    fatPercent,
    musclePercent,
    fatZones: zones,
    ghost: _opts?.ghost,
    compositionKnown: true,
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
    ghost?: boolean;
  }
): void {
  const critical = new Set(criticalMeshes.map((n) => normalizeMeshName(n)));
  const compositionKnown = opts?.compositionKnown === true;

  applyHologramTwinMaterials(root, {
    fatPercent: compositionKnown ? (opts?.fatPercent ?? 22) : undefined,
    musclePercent: opts?.musclePercent ?? 42,
    fatZones: opts?.fatZones,
    ghost: opts?.ghost,
    compositionKnown,
  });

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!critical.has(normalizeMeshName(mesh.name))) return;
    paintHologramPiece(mesh, {
      face: isFaceMesh(mesh.name),
      critical: true,
      muscleBoost: 1,
      ghost: opts?.ghost,
      compositionKnown,
    });
  });
}
