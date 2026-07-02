import * as THREE from "three";

export interface ModelFit {
  object: THREE.Object3D;
  scale: number;
  position: [number, number, number];
}

/** Ensure meshes are visible with PBR materials (FBX often uses Phong). */
export function normalizeModelMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const convert = (mat: THREE.Material): THREE.MeshStandardMaterial => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.side = THREE.DoubleSide;
        return mat;
      }
      const legacy = mat as THREE.MeshPhongMaterial;
      return new THREE.MeshStandardMaterial({
        color: legacy.color?.clone() ?? new THREE.Color(0xcbd5e1),
        map: legacy.map ?? null,
        normalMap: legacy.normalMap ?? null,
        roughness: 0.55,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(convert);
    } else {
      mesh.material = convert(mesh.material);
    }
  });
}

/** Fit model into view — no clone (safe for skinned FBX). */
export function fitModelToScene(
  scene: THREE.Object3D,
  targetHeight = 1.75
): ModelFit {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);

  if (box.isEmpty()) {
    return { object: scene, scale: 1, position: [0, 0, 0] };
  }

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const scale = targetHeight / maxDim;
  const position: [number, number, number] = [
    -box.getCenter(new THREE.Vector3()).x * scale,
    -box.min.y * scale,
    -box.getCenter(new THREE.Vector3()).z * scale,
  ];

  return { object: scene, scale, position };
}

export function hasRiggedSkeleton(root: THREE.Object3D): boolean {
  let bones = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones++;
  });
  return bones >= 4;
}

/** True when the loaded file has drawable mesh geometry (not skeleton-only). */
export function hasVisibleGeometry(root: THREE.Object3D): boolean {
  let meshes = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    if (geo && geo.attributes.position && geo.attributes.position.count > 0) {
      meshes++;
    }
  });
  return meshes > 0;
}
