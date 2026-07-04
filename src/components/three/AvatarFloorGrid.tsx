"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Static floor grid under the avatar — tuned for dark viewport. */
export default function AvatarFloorGrid({
  pulse = false,
}: {
  lightTheme?: boolean;
  pulse?: boolean;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const grid = useMemo(() => {
    const size = 4.2;
    const divisions = 18;
    const g = new THREE.GridHelper(size, divisions, 0x22d3ee, 0x1e3a5f);
    g.position.y = 0.001;
    const mats = g.material;
    if (Array.isArray(mats)) {
      mats.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.55;
        m.depthWrite = false;
      });
    } else {
      mats.transparent = true;
      mats.opacity = 0.55;
      mats.depthWrite = false;
    }
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (!pulse || !matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.opacity = 0.1 + Math.sin(t * 1.4) * 0.05;
  });

  return (
    <group position={[0, 0, 0]}>
      <primitive object={grid} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[1.8, 48]} />
        <meshBasicMaterial
          ref={matRef}
          color="#0ea5e9"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.75, 1.82, 64]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
