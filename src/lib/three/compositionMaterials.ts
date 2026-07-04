import * as THREE from "three";
import {
  classifyAvatarMesh,
  normalizeMeshName,
} from "@/lib/three/muscleGroups";

const FAT = new THREE.Color("#f59e0b");
const FAT_EMISSIVE = new THREE.Color("#f97316");
const MUSCLE = new THREE.Color("#22c55e");
const MUSCLE_EMISSIVE = new THREE.Color("#4ade80");
const CRITICAL = new THREE.Color("#ef4444");
const CRITICAL_EMISSIVE = new THREE.Color("#f87171");
const NEUTRAL = new THREE.Color("#94a3b8");
const NEUTRAL_EMISSIVE = new THREE.Color("#06b6d4");
const WIRE_CYAN = new THREE.Color("#22d3ee");

function setMeshMaterial(
  mesh: THREE.Mesh,
  opts: {
    color: THREE.Color;
    emissive: THREE.Color;
    emissiveIntensity: number;
    opacity?: number;
    wireframe?: boolean;
  }
): void {
  mesh.material = new THREE.MeshStandardMaterial({
    color: opts.color,
    emissive: opts.emissive,
    emissiveIntensity: opts.emissiveIntensity,
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: opts.opacity ?? 0.92,
    wireframe: opts.wireframe ?? false,
    side: THREE.DoubleSide,
  });
}

/** Idle / pre-scan: cyan anatomical wireframe. */
export function applyScanWireframe(root: THREE.Object3D, light = false): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const kind = classifyAvatarMesh(mesh.name);
    const isFat = kind === "fat";
    setMeshMaterial(mesh, {
      color: isFat
        ? new THREE.Color(light ? "#94a3b8" : "#64748b")
        : new THREE.Color(light ? "#06b6d4" : "#22c55e"),
      emissive: WIRE_CYAN,
      emissiveIntensity: light ? (isFat ? 0.08 : 0.35) : isFat ? 0.05 : 0.22,
      opacity: isFat ? 0.25 : 0.88,
      wireframe: true,
    });
    mesh.visible = true;
  });
}

/**
 * After body scan verification: fat meshes amber, muscle meshes green.
 * Intensity scales with composition percentages.
 */
export function applyCompositionVertexMaterials(
  root: THREE.Object3D,
  fatPercent = 22,
  musclePercent = 42
): void {
  const fatBoost = Math.min(1, Math.max(0.15, fatPercent / 40));
  const muscleBoost = Math.min(1, Math.max(0.2, musclePercent / 55));

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const kind = classifyAvatarMesh(mesh.name);

    if (kind === "fat") {
      setMeshMaterial(mesh, {
        color: FAT,
        emissive: FAT_EMISSIVE,
        emissiveIntensity: 0.25 + fatBoost * 0.85,
        opacity: 0.35 + fatBoost * 0.45,
        wireframe: false,
      });
      mesh.visible = fatPercent > 8;
      return;
    }

    if (kind === "muscle") {
      setMeshMaterial(mesh, {
        color: MUSCLE,
        emissive: MUSCLE_EMISSIVE,
        emissiveIntensity: 0.2 + muscleBoost * 0.55,
        opacity: 0.78 + muscleBoost * 0.18,
        wireframe: false,
      });
      mesh.visible = true;
      return;
    }

    setMeshMaterial(mesh, {
      color: NEUTRAL,
      emissive: NEUTRAL_EMISSIVE,
      emissiveIntensity: 0.12,
      opacity: 0.55,
      wireframe: true,
    });
  });
}

/**
 * Post-workout critical technique: listed muscle meshes glow red.
 * Other muscles stay muted green; fat stays amber if composition known.
 */
export function applyCriticalMuscleMaterials(
  root: THREE.Object3D,
  criticalMeshes: string[],
  opts?: {
    fatPercent?: number;
    musclePercent?: number;
    compositionKnown?: boolean;
  }
): void {
  const critical = new Set(
    criticalMeshes.map((n) => normalizeMeshName(n))
  );
  const compositionKnown = opts?.compositionKnown ?? false;
  const fatPercent = opts?.fatPercent ?? 22;
  const musclePercent = opts?.musclePercent ?? 42;

  if (compositionKnown) {
    applyCompositionVertexMaterials(root, fatPercent, musclePercent);
  } else {
    applyScanWireframe(root, true);
  }

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const n = normalizeMeshName(mesh.name);
    if (!critical.has(n)) return;

    setMeshMaterial(mesh, {
      color: CRITICAL,
      emissive: CRITICAL_EMISSIVE,
      emissiveIntensity: 0.95,
      opacity: 0.96,
      wireframe: false,
    });
    mesh.visible = true;
  });
}

/** Soft idle materials when no scan and no critical state. */
export function applyIdleAnatomicalMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const kind = classifyAvatarMesh(mesh.name);

    if (kind === "fat") {
      setMeshMaterial(mesh, {
        color: new THREE.Color("#cbd5e1"),
        emissive: new THREE.Color("#94a3b8"),
        emissiveIntensity: 0.08,
        opacity: 0.2,
        wireframe: false,
      });
      return;
    }

    if (kind === "muscle") {
      setMeshMaterial(mesh, {
        color: new THREE.Color("#67e8f9"),
        emissive: WIRE_CYAN,
        emissiveIntensity: 0.18,
        opacity: 0.82,
        wireframe: false,
      });
      return;
    }

    setMeshMaterial(mesh, {
      color: NEUTRAL,
      emissive: NEUTRAL_EMISSIVE,
      emissiveIntensity: 0.1,
      opacity: 0.5,
      wireframe: true,
    });
  });
}
