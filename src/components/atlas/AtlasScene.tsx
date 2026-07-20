"use client";

import { Html, OrbitControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";
import type { AtlasVisualizationInput } from "@/types/atlas";
import { AtlasModel } from "@/components/atlas/AtlasModel";

interface AtlasSceneProps {
  input: AtlasVisualizationInput;
  variant: "full" | "mini";
  interactive: boolean;
  modelUrl: string;
  onZoneSelect?: (zone: MuscleMeshName | null) => void;
}

function LoadingIndicator() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="rounded-lg border border-cyan-300/30 bg-black/80 px-3 py-2 font-mono text-xs text-cyan-200">
        ATLAS {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

export default function AtlasScene({
  input,
  variant,
  interactive,
  modelUrl,
  onZoneSelect,
}: AtlasSceneProps) {
  const mini = variant === "mini";

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{
        position: mini ? [0, 0.9, 3.2] : [0, 1, 3.8],
        fov: mini ? 38 : 42,
        near: 0.1,
        far: 50,
      }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      onPointerMissed={() => onZoneSelect?.(null)}
    >
      <color attach="background" args={["#04070d"]} />
      <ambientLight intensity={0.3} color="#9bc9ff" />
      <hemisphereLight args={["#b9dcff", "#07121f", 0.7]} />
      <directionalLight position={[3.5, 5, 4]} intensity={2.1} color="#ffffff" />
      <directionalLight position={[-3, 2, -3]} intensity={0.55} color="#1bd6ff" />

      <Suspense fallback={<LoadingIndicator />}>
        <AtlasModel
          modelUrl={modelUrl}
          zones={input.zones}
          mode={input.mode ?? "scan"}
          selectedZone={input.selectedZone}
          onZoneSelect={onZoneSelect}
        />
      </Suspense>

      {interactive ? (
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          target={[0, 0.85, 0]}
          minDistance={mini ? 2.5 : 2.8}
          maxDistance={mini ? 4.6 : 6}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI - 0.25}
        />
      ) : null}
    </Canvas>
  );
}
