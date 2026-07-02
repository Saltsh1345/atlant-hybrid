"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import type { NormalizedLandmark } from "@/types";
import type { AvatarAsset } from "@/hooks/useAvatarAsset";
import { landmarksToRig, type RigPose } from "@/lib/pose/poseToRig";
import { findBones, applyRigToBones } from "@/lib/pose/applyRigToGlb";
import {
  fitModelToScene,
  hasRiggedSkeleton,
  hasVisibleGeometry,
  normalizeModelMaterials,
} from "@/lib/three/fitModel";
import {
  applyCompositionVertexMaterials,
  applyScanWireframe,
} from "@/lib/three/compositionMaterials";

export type AvatarModelKind =
  | "loading"
  | "procedural"
  | "mesh"
  | "skeleton-only";

const DEFAULT_RIG: RigPose = {
  leftUpperArm: 0,
  leftLowerArm: 0,
  rightUpperArm: 0,
  rightLowerArm: 0,
  leftUpperLeg: 0,
  leftLowerLeg: 0,
  rightUpperLeg: 0,
  rightLowerLeg: 0,
  torsoLean: 0,
};

function tensionToColor(base: string, tension: number): string {
  if (tension < 0.3) return base;
  if (tension < 0.6) return "#f97316";
  return "#ef4444";
}

function applyScanMaterials(root: THREE.Object3D, tension: number, cyan = false): void {
  let idx = 0;
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const isTorso = idx === 0 || mesh.name.toLowerCase().includes("body");
    const base = cyan
      ? isTorso
        ? "#f97316"
        : "#06b6d4"
      : isTorso
        ? "#fbbf24"
        : "#22c55e";
    mesh.material = new THREE.MeshStandardMaterial({
      color: tensionToColor(base, tension),
      wireframe: true,
      transparent: true,
      opacity: cyan ? 0.95 : 0.9,
      emissive: new THREE.Color(cyan ? "#22d3ee" : "#000000"),
      emissiveIntensity: cyan ? 0.35 : 0,
      side: THREE.DoubleSide,
    });
    idx++;
  });
}

function meshZone(mesh: THREE.Mesh, meshCount: number): "torso" | "limb" {
  const name = mesh.name.toLowerCase();
  if (/arm|leg|hand|foot|thigh|calf|shoulder|forearm|shin|bicep|quad/i.test(name)) {
    return "limb";
  }
  if (/body|torso|chest|spine|belly|hips|pelvis|abdomen|stomach/i.test(name)) {
    return "torso";
  }
  if (meshCount === 1) {
    mesh.geometry?.computeBoundingBox();
    const box = mesh.geometry?.boundingBox;
    if (box) {
      const h = box.max.y - box.min.y;
      const midY = (box.min.y + box.max.y) / 2;
      const rel = h > 0 ? (midY - box.min.y) / h : 0.5;
      return rel > 0.35 && rel < 0.78 ? "torso" : "limb";
    }
    return "torso";
  }
  return "limb";
}

/** Visible fat/muscle tint — strong emissive zones like PDF reference. */
function applyCompositionMaterials(
  root: THREE.Object3D,
  fatPercent = 20,
  musclePercent = 40
): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });

  for (const mesh of meshes) {
    const zone = meshZone(mesh, meshes.length);
    const isTorso = zone === "torso";
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isTorso ? "#f59e0b" : "#22c55e"),
      emissive: new THREE.Color(isTorso ? "#f97316" : "#4ade80"),
      emissiveIntensity: isTorso
        ? 0.35 + fatPercent / 180
        : 0.3 + musclePercent / 200,
      roughness: 0.45,
      metalness: 0.08,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
  }
}

function applyStaticPose(group: THREE.Object3D, rig: RigPose, lerp = 0.2): void {
  const squat = (rig.leftUpperLeg + rig.rightUpperLeg) / 2;
  const lean = THREE.MathUtils.clamp(rig.torsoLean, -0.22, 0.22);
  const squatTarget = THREE.MathUtils.clamp(squat * 0.24, -0.16, 0.2);
  group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, lean, lerp * 0.75);
  group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, squatTarget, lerp * 0.65);
  group.position.y = THREE.MathUtils.lerp(group.position.y, -squat * 0.08, lerp * 0.6);
}

function SceneAvatar({
  scene,
  rig,
  tension,
  scanMode,
  compositionMode,
  fatPercent,
  musclePercent,
  lightTheme,
  onModelKind,
}: {
  scene: THREE.Object3D;
  rig: RigPose;
  tension: number;
  scanMode: boolean;
  compositionMode?: boolean;
  fatPercent?: number;
  musclePercent?: number;
  lightTheme?: boolean;
  onModelKind?: (kind: AvatarModelKind) => void;
}) {
  const hasMesh = useMemo(() => hasVisibleGeometry(scene), [scene]);

  const prepared = useMemo(() => {
    if (!hasMesh) return null;
    normalizeModelMaterials(scene);
    return fitModelToScene(scene);
  }, [scene, hasMesh]);

  const groupRef = useRef<THREE.Group>(null);
  const bonesRef = useRef<ReturnType<typeof findBones>>(new Map());
  const rigged = useMemo(
    () => (prepared ? hasRiggedSkeleton(prepared.object) : false),
    [prepared]
  );
  const limbMats = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    if (!hasMesh) {
      onModelKind?.("skeleton-only");
      return;
    }
    onModelKind?.("mesh");
  }, [scene, hasMesh, onModelKind]);

  useEffect(() => {
    if (!prepared) return;
    bonesRef.current = findBones(prepared.object);
    limbMats.current = [];
    if (compositionMode) {
      applyCompositionVertexMaterials(
        prepared.object,
        fatPercent ?? 20,
        musclePercent ?? 40
      );
    } else if (scanMode) {
      applyScanWireframe(prepared.object, lightTheme);
    } else {
      normalizeModelMaterials(prepared.object);
    }
  }, [prepared, scanMode, compositionMode, tension, fatPercent, musclePercent, lightTheme]);

  useFrame(() => {
    if (!prepared) return;
    if (compositionMode) return;
    if (rigged && bonesRef.current.size > 2) {
      applyRigToBones(bonesRef.current, rig);
    } else if (groupRef.current) {
      applyStaticPose(groupRef.current, rig);
    }
    for (const mat of limbMats.current) {
      mat.color.set(tensionToColor("#22c55e", tension));
    }
  });

  if (!hasMesh || !prepared) {
    return <PoseDrivenAvatar rig={rig} tension={tension} />;
  }

  return (
    <group ref={groupRef} scale={prepared.scale} position={prepared.position}>
      <primitive object={prepared.object} />
    </group>
  );
}

function GlbModel({
  url,
  onModelKind,
  ...props
}: { url: string; onModelKind?: (kind: AvatarModelKind) => void } & Omit<
  React.ComponentProps<typeof SceneAvatar>,
  "scene" | "onModelKind"
>) {
  const { scene } = useGLTF(url);
  return <SceneAvatar scene={scene} onModelKind={onModelKind} {...props} />;
}

function FbxModel({
  url,
  onModelKind,
  ...props
}: { url: string; onModelKind?: (kind: AvatarModelKind) => void } & Omit<
  React.ComponentProps<typeof SceneAvatar>,
  "scene" | "onModelKind"
>) {
  const fbx = useLoader(FBXLoader, url);
  return <SceneAvatar scene={fbx} onModelKind={onModelKind} {...props} />;
}

export function PoseDrivenAvatar({
  rig,
  tension,
}: {
  rig: RigPose;
  tension: number;
}) {
  const torsoRef = useRef<THREE.Group>(null);
  const current = useRef<RigPose>({ ...DEFAULT_RIG });

  useFrame(() => {
    const c = current.current;
    const t = 0.25;
    (Object.keys(DEFAULT_RIG) as (keyof RigPose)[]).forEach((key) => {
      c[key] += (rig[key] - c[key]) * t;
    });
    if (torsoRef.current) torsoRef.current.rotation.z = c.torsoLean;
  });

  const legColor = tensionToColor("#22c55e", tension);

  return (
    <group position={[0, -0.5, 0]}>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#22c55e" wireframe />
      </mesh>
      <group ref={torsoRef} position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.7, 0.25]} />
          <meshStandardMaterial color="#fbbf24" wireframe />
        </mesh>
        <mesh position={[-0.15, -0.5, 0]}>
          <capsuleGeometry args={[0.08, 0.7, 4, 8]} />
          <meshStandardMaterial color={legColor} wireframe />
        </mesh>
        <mesh position={[0.15, -0.5, 0]}>
          <capsuleGeometry args={[0.08, 0.7, 4, 8]} />
          <meshStandardMaterial color={legColor} wireframe />
        </mesh>
      </group>
    </group>
  );
}

function AvatarLoader() {
  return (
    <mesh>
      <boxGeometry args={[0.25, 0.5, 0.15]} />
      <meshStandardMaterial color="#475569" wireframe />
    </mesh>
  );
}

function AvatarScene({
  asset,
  rig,
  tension,
  scanMode,
  compositionMode,
  fatPercent,
  musclePercent,
  lightTheme,
  onModelKind,
}: {
  asset: AvatarAsset | null;
  rig: RigPose;
  tension: number;
  scanMode: boolean;
  compositionMode?: boolean;
  fatPercent?: number;
  musclePercent?: number;
  lightTheme?: boolean;
  onModelKind?: (kind: AvatarModelKind) => void;
}) {
  useEffect(() => {
    if (!asset) onModelKind?.("procedural");
  }, [asset, onModelKind]);

  if (!asset) return <PoseDrivenAvatar rig={rig} tension={tension} />;

  if (asset.format === "fbx") {
    return (
      <FbxModel
        url={asset.url}
        rig={rig}
        tension={tension}
        scanMode={scanMode}
        compositionMode={compositionMode}
        fatPercent={fatPercent}
        musclePercent={musclePercent}
        lightTheme={lightTheme}
        onModelKind={onModelKind}
      />
    );
  }

  return (
    <GlbModel
      url={asset.url}
      rig={rig}
      tension={tension}
      scanMode={scanMode}
      compositionMode={compositionMode}
      fatPercent={fatPercent}
      musclePercent={musclePercent}
      lightTheme={lightTheme}
      onModelKind={onModelKind}
    />
  );
}

export interface AvatarViewerInnerProps {
  asset: AvatarAsset | null;
  assetReady?: boolean;
  showWireframe: boolean;
  tension?: number;
  compact?: boolean;
  tall?: boolean;
  interactive?: boolean;
  compositionMode?: boolean;
  fatPercent?: number;
  musclePercent?: number;
  landmarks?: NormalizedLandmark[] | null;
  theme?: "light" | "dark";
  fillHeight?: boolean;
  onModelKind?: (kind: AvatarModelKind) => void;
}

export default function AvatarViewerInner({
  asset,
  assetReady = true,
  showWireframe,
  tension = 0,
  compact,
  tall,
  interactive = true,
  compositionMode = false,
  fatPercent,
  musclePercent,
  landmarks = null,
  theme = "dark",
  fillHeight = false,
  onModelKind,
}: AvatarViewerInnerProps) {
  const rig = useMemo(
    () => landmarksToRig(landmarks) ?? DEFAULT_RIG,
    [landmarks]
  );

  const lightTheme = theme === "light";
  const heightClass = fillHeight
    ? "h-full min-h-[12rem]"
    : compact
      ? "h-32"
      : tall
        ? "h-52"
        : "h-48";
  const shellClass = lightTheme
    ? "bg-gradient-to-b from-slate-50 to-cyan-50/80"
    : "bg-gradient-to-b from-slate-700 to-slate-900";
  const canvasBg = lightTheme ? "#f0f9ff" : "#1e293b";
  const camZ = compositionMode ? 4.2 : 2.8;
  const camY = compositionMode ? 1.0 : 0.9;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl ${shellClass} ${heightClass}`}
    >
      {!assetReady && (
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center ${
            lightTheme ? "bg-white/80" : "bg-slate-900/80"
          }`}
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      )}
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, camY, camZ], fov: compositionMode ? 34 : 40, near: 0.01, far: 1000 }}
        style={{ width: "100%", height: "100%", minHeight: compact ? 128 : tall ? 208 : 192 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[canvasBg]} />
        <ambientLight intensity={lightTheme ? 1.8 : 1.45} />
        <directionalLight position={[3, 5, 4]} intensity={lightTheme ? 1.6 : 2.05} />
        <directionalLight position={[-3, 2, -2]} intensity={lightTheme ? 0.7 : 0.9} />
        <hemisphereLight
          args={lightTheme ? ["#ffffff", "#e0f2fe", 0.9] : ["#e2e8f0", "#334155", 0.7]}
        />
        <Suspense fallback={<AvatarLoader />}>
          <AvatarScene
            asset={asset}
            rig={rig}
            tension={tension}
            scanMode={showWireframe}
            compositionMode={compositionMode}
            fatPercent={fatPercent}
            musclePercent={musclePercent}
            lightTheme={lightTheme}
            onModelKind={onModelKind}
          />
        </Suspense>
        {interactive && (
          <OrbitControls
            enableZoom={!compact}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minPolarAngle={Math.PI / 5}
            maxPolarAngle={Math.PI / 1.85}
            target={[0, 0.85, 0]}
          />
        )}
      </Canvas>
    </div>
  );
}
