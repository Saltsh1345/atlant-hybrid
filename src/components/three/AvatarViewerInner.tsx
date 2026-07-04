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
  applyCriticalMuscleMaterials,
  applyIdleAnatomicalMaterials,
} from "@/lib/three/compositionMaterials";
import { normalizeMeshName } from "@/lib/three/muscleGroups";
import AvatarFloorGrid from "@/components/three/AvatarFloorGrid";

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
  compositionMode,
  fatPercent,
  musclePercent,
  fatZones,
  criticalMeshes,
  idleAnimate,
  onModelKind,
}: {
  scene: THREE.Object3D;
  rig: RigPose;
  compositionMode?: boolean;
  fatPercent?: number;
  musclePercent?: number;
  fatZones?: import("@/types").FatZoneMap;
  criticalMeshes?: string[];
  idleAnimate?: boolean;
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
  const criticalMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const rigged = useMemo(
    () => (prepared ? hasRiggedSkeleton(prepared.object) : false),
    [prepared]
  );

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
    criticalMats.current = [];

    const critical = criticalMeshes ?? [];
    if (critical.length > 0) {
      applyCriticalMuscleMaterials(prepared.object, critical, {
        fatPercent,
        musclePercent,
        compositionKnown: !!compositionMode,
        fatZones,
      });
    } else if (compositionMode) {
      applyCompositionVertexMaterials(
        prepared.object,
        fatPercent ?? 20,
        musclePercent ?? 40,
        fatZones
      );
    } else {
      applyIdleAnatomicalMaterials(prepared.object);
    }

    if (critical.length > 0) {
      const set = new Set(critical.map(normalizeMeshName));
      prepared.object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (!set.has(normalizeMeshName(mesh.name))) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat?.isMeshStandardMaterial) criticalMats.current.push(mat);
      });
    }
  }, [
    prepared,
    compositionMode,
    fatPercent,
    musclePercent,
    fatZones,
    criticalMeshes,
  ]);

  useFrame(({ clock }) => {
    if (!prepared || !groupRef.current) return;

    if (idleAnimate && !rigged) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.12;
      groupRef.current.position.y =
        prepared.position[1] + Math.sin(t * 1.1) * 0.012;
    }

    if (rigged && bonesRef.current.size > 2) {
      applyRigToBones(bonesRef.current, rig);
    } else if (!idleAnimate) {
      applyStaticPose(groupRef.current, rig);
    }

    for (const mat of criticalMats.current) {
      const pulse = 0.65 + Math.sin(clock.getElapsedTime() * 3.2) * 0.3;
      mat.emissiveIntensity = pulse;
    }
  });

  if (!hasMesh || !prepared) {
    return <PoseDrivenAvatar rig={rig} />;
  }

  return (
    <group
      ref={groupRef}
      scale={prepared.scale}
      position={prepared.position}
    >
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
  const gltf = useGLTF(url);
  const clone = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        mesh.geometry = mesh.geometry.clone();
      }
    });
    return root;
  }, [gltf.scene]);
  return <SceneAvatar scene={clone} onModelKind={onModelKind} {...props} />;
}

useGLTF.preload("/avatar.glb");

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
}: {
  rig: RigPose;
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

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color="#22c55e" wireframe />
      </mesh>
      <group ref={torsoRef} position={[0, 0.95, 0]}>
        <mesh>
          <boxGeometry args={[0.45, 0.65, 0.22]} />
          <meshStandardMaterial color="#fbbf24" wireframe />
        </mesh>
        <mesh position={[-0.14, -0.55, 0]}>
          <capsuleGeometry args={[0.07, 0.65, 4, 8]} />
          <meshStandardMaterial color="#22c55e" wireframe />
        </mesh>
        <mesh position={[0.14, -0.55, 0]}>
          <capsuleGeometry args={[0.07, 0.65, 4, 8]} />
          <meshStandardMaterial color="#22c55e" wireframe />
        </mesh>
      </group>
    </group>
  );
}

function AvatarLoader() {
  return (
    <mesh position={[0, 0.9, 0]}>
      <boxGeometry args={[0.25, 0.5, 0.15]} />
      <meshStandardMaterial color="#475569" wireframe />
    </mesh>
  );
}

function AvatarScene({
  asset,
  rig,
  compositionMode,
  fatPercent,
  musclePercent,
  fatZones,
  criticalMeshes,
  idleAnimate,
  onModelKind,
}: {
  asset: AvatarAsset | null;
  rig: RigPose;
  compositionMode?: boolean;
  fatPercent?: number;
  musclePercent?: number;
  fatZones?: import("@/types").FatZoneMap;
  criticalMeshes?: string[];
  idleAnimate?: boolean;
  onModelKind?: (kind: AvatarModelKind) => void;
}) {
  useEffect(() => {
    if (!asset) onModelKind?.("procedural");
  }, [asset, onModelKind]);

  if (!asset) return <PoseDrivenAvatar rig={rig} />;

  if (asset.format === "fbx") {
    return (
      <FbxModel
        url={asset.url}
        rig={rig}
        compositionMode={compositionMode}
        fatPercent={fatPercent}
        musclePercent={musclePercent}
        fatZones={fatZones}
        criticalMeshes={criticalMeshes}
        idleAnimate={idleAnimate}
        onModelKind={onModelKind}
      />
    );
  }

  return (
    <GlbModel
      url={asset.url}
      rig={rig}
      compositionMode={compositionMode}
      fatPercent={fatPercent}
      musclePercent={musclePercent}
      fatZones={fatZones}
      criticalMeshes={criticalMeshes}
      idleAnimate={idleAnimate}
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
  fatZones?: import("@/types").FatZoneMap;
  /** Mesh names to highlight red (poor technique). */
  criticalMeshes?: string[];
  idleAnimate?: boolean;
  landmarks?: NormalizedLandmark[] | null;
  theme?: "light" | "dark";
  fillHeight?: boolean;
  onModelKind?: (kind: AvatarModelKind) => void;
}

export default function AvatarViewerInner({
  asset,
  assetReady = true,
  showWireframe,
  compact,
  tall,
  interactive = true,
  compositionMode = false,
  fatPercent,
  musclePercent,
  fatZones,
  criticalMeshes,
  idleAnimate = true,
  landmarks = null,
  theme = "dark",
  fillHeight = false,
  onModelKind,
}: AvatarViewerInnerProps) {
  const rig = useMemo(
    () => landmarksToRig(landmarks) ?? DEFAULT_RIG,
    [landmarks]
  );

  const heightClass = fillHeight
    ? "h-full min-h-[12rem]"
    : compact
      ? "h-32"
      : tall
        ? "h-52"
        : "h-48";
  const canvasBg = "#0b1220";
  const camZ = compositionMode || (criticalMeshes?.length ?? 0) > 0 ? 3.6 : 3.2;
  const camY = 0.95;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 ${heightClass}`}
      style={fillHeight ? { minHeight: 220 } : undefined}
    >
      {!assetReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      )}
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: "default" }}
        camera={{
          position: [0, camY, camZ],
          fov: 36,
          near: 0.01,
          far: 1000,
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        dpr={[1, 1.5]}
        resize={{ scroll: false, debounce: 100 }}
      >
        <color attach="background" args={[canvasBg]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2.5, 4.5, 3]} intensity={1.8} color="#e0f2fe" />
        <directionalLight position={[-2.5, 2, -1.5]} intensity={0.7} color="#38bdf8" />
        <pointLight
          position={[0, 2.4, 1.4]}
          intensity={criticalMeshes?.length ? 1.1 : 0.85}
          color={criticalMeshes?.length ? "#ef4444" : "#22d3ee"}
        />
        <hemisphereLight args={["#94a3b8", "#0f172a", 0.45]} />
        <AvatarFloorGrid pulse={(criticalMeshes?.length ?? 0) > 0} />
        <Suspense fallback={<AvatarLoader />}>
          <AvatarScene
            asset={asset}
            rig={rig}
            compositionMode={compositionMode}
            fatPercent={fatPercent}
            musclePercent={musclePercent}
            fatZones={fatZones}
            criticalMeshes={criticalMeshes}
            idleAnimate={idleAnimate}
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
