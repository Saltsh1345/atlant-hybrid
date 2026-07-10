"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Floor under hologram twin — dark + thin cyan ring like reference */
export default function AvatarFloorGrid({
  pulse = false,
  subtle = false,
}: {
  lightTheme?: boolean;
  pulse?: boolean;
  subtle?: boolean;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const grid = useMemo(() => {
    const size = 3.6;
    const divisions = 28;
    const g = new THREE.GridHelper(size, divisions, 0x38bdf8, 0x082f49);
    g.position.y = 0.001;
    const mats = g.material;
    if (Array.isArray(mats)) {
      mats.forEach((m) => {
        m.transparent = true;
        m.opacity = subtle ? 0.12 : 0.35;
        m.depthWrite = false;
      });
    } else {
      mats.transparent = true;
      mats.opacity = subtle ? 0.12 : 0.35;
      mats.depthWrite = false;
    }
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    if (subtle) {
      matRef.current.opacity = 0.03 + Math.sin(t * 0.7) * 0.015;
      return;
    }
    matRef.current.opacity = pulse
      ? 0.08 + Math.sin(t * 1.2) * 0.04
      : 0.07 + Math.sin(t * 0.7) * 0.02;
  });

  if (subtle) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.95, 1.02, 64]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }

  return (
    <group>
      <primitive object={grid} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.15, 64]} />
        <meshBasicMaterial
          ref={matRef}
          color="#0284c7"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.12, 1.16, 96]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
