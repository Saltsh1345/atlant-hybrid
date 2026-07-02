import * as THREE from "three";

type BodyZone = "torso" | "limb" | "other";

function zoneForVertex(x: number, y: number, box: THREE.Box3): BodyZone {
  const h = box.max.y - box.min.y;
  const w = box.max.x - box.min.x;
  if (h < 1e-6) return "other";

  const relY = (y - box.min.y) / h;
  const cx = (box.min.x + box.max.x) / 2;
  const relX = Math.abs(x - cx) / (w / 2 + 1e-6);

  if (relY > 0.76) return "other";
  if (relY >= 0.36 && relY <= 0.7 && relX < 0.4) return "torso";
  if (relY >= 0.08 && relY <= 0.95) return "limb";
  return "other";
}

const FAT = new THREE.Color("#f59e0b");
const MUSCLE = new THREE.Color("#22c55e");
const NEUTRAL = new THREE.Color("#bae6fd");
const WIRE_CYAN = new THREE.Color("#06b6d4");

/** Per-vertex fat (torso) / muscle (limbs) + cyan wireframe — works on single Mixamo mesh. */
export function applyCompositionVertexMaterials(
  root: THREE.Object3D,
  fatPercent = 22,
  musclePercent = 42
): void {
  const fatBoost = 0.25 + fatPercent / 200;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;

    const src = mesh.geometry;
    const geo = src.index ? src.clone() : src.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox;
    if (!box) return;

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const zone = zoneForVertex(x, y, box);

      let c: THREE.Color;
      if (zone === "torso") c = FAT.clone();
      else if (zone === "limb") c = MUSCLE.clone();
      else c = NEUTRAL.clone();

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    mesh.geometry = geo;

    mesh.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.94,
      roughness: 0.3,
      metalness: 0.15,
      emissive: WIRE_CYAN,
      emissiveIntensity: 0.12 + fatBoost * 0.1,
      side: THREE.DoubleSide,
    });
  });
}

/** Cyan scan wireframe for live / preview mode. */
export function applyScanWireframe(root: THREE.Object3D, light = false): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.material = new THREE.MeshStandardMaterial({
      color: light ? "#06b6d4" : "#22c55e",
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color("#22d3ee"),
      emissiveIntensity: light ? 0.4 : 0.2,
      side: THREE.DoubleSide,
    });
  });
}
