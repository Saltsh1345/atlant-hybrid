"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Static perspective floor grid under the avatar. */
export default function AvatarFloorGrid({
  lightTheme = true,
  pulse = false,
}: {
  lightTheme?: boolean;
  pulse?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const grid = useMemo(() => {
    const size = 4.2;
    const divisions = 18;
    const colorCenter = lightTheme ? 0x06b6d4 : 0x22d3ee;
    const colorGrid = lightTheme ? 0x94a3b8 : 0x334155;
    const g = new THREE.GridHelper(size, divisions, colorCenter, colorGrid);
    g.position.y = 0.001;
    const mats = g.material;
    if (Array.isArray(mats)) {
      mats.forEach((m) => {
        m.transparent = true;
        m.opacity = lightTheme ? 0.45 : 0.55;
        m.depthWrite = false;
      });
    } else {
      mats.transparent = true;
      mats.opacity = lightTheme ? 0.45 : 0.55;
      mats.depthWrite = false;
    }
    return g;
  }, [lightTheme]);

  useFrame(({ clock }) => {
    if (!pulse || !matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.opacity = 0.12 + Math.sin(t * 1.4) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={grid} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshBasicMaterial
          ref={matRef}
          color={lightTheme ? "#06b6d4" : "#22d3ee"}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.75, 1.82, 64]} />
        <meshBasicMaterial
          color={lightTheme ? "#0ea5e9" : "#22d3ee"}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
