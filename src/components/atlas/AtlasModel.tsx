"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";
import type {
  AtlasMode,
  AtlasZoneVisual,
} from "@/types/atlas";
import { atlasMuscleName } from "@/lib/three/atlasMuscleMap";
import {
  atlasZoneMap,
  createAtlasMeshMaterial,
  disposeAtlasMaterials,
  type AtlasPulseMaterial,
} from "@/lib/three/atlasZoneMaterial";

interface AtlasModelProps {
  modelUrl: string;
  zones: AtlasZoneVisual[];
  mode: AtlasMode;
  selectedZone?: string | null;
  onZoneSelect?: (zone: MuscleMeshName | null) => void;
}

function centeredClone(source: THREE.Object3D) {
  const model = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.position.y -= bounds.min.y - center.y;
  return model;
}

export function AtlasModel({
  modelUrl,
  zones,
  mode,
  selectedZone,
  onZoneSelect,
}: AtlasModelProps) {
  const gltf = useGLTF(modelUrl, true);
  const pulsesRef = useRef<AtlasPulseMaterial[]>([]);
  const scene = useMemo(() => centeredClone(gltf.scene), [gltf.scene]);
  const zoneMap = useMemo(() => atlasZoneMap(zones), [zones]);

  useEffect(() => {
    pulsesRef.current = [];

    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const muscleName = atlasMuscleName(object.name);

      if (!muscleName) {
        object.visible = false;
        return;
      }

      const { material, pulse } = createAtlasMeshMaterial(
        muscleName,
        zoneMap,
        mode,
        selectedZone,
      );
      object.material = material;
      object.visible = true;
      if (pulse) pulsesRef.current.push(pulse);
    });

    return () => {
      disposeAtlasMaterials(scene);
      pulsesRef.current = [];
    };
  }, [mode, scene, selectedZone, zoneMap]);

  useFrame(({ clock }) => {
    const pulse = 0.72 + Math.sin(clock.getElapsedTime() * 4) * 0.28;
    pulsesRef.current.forEach(({ material, baseIntensity }) => {
      material.emissiveIntensity = baseIntensity * pulse;
    });
  });

  return (
    <primitive
      object={scene}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onZoneSelect?.(atlasMuscleName(event.object.name));
      }}
    />
  );
}

useGLTF.preload("/avatar.glb", true);
