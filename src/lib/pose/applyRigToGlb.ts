import * as THREE from "three";
import type { RigPose } from "@/lib/pose/poseToRig";

type BoneKey = keyof Omit<RigPose, "torsoLean"> | "spine" | "hips";

const PATTERNS: Record<BoneKey, string[]> = {
  leftUpperArm: ["leftarm", "upperarm_l", "arm_l", "left_shoulder", "mixamorigleftarm"],
  leftLowerArm: ["leftforearm", "lowerarm_l", "forearm_l", "mixamorigleftforearm"],
  rightUpperArm: ["rightarm", "upperarm_r", "arm_r", "right_shoulder", "mixamorigrightarm"],
  rightLowerArm: ["rightforearm", "lowerarm_r", "forearm_r", "mixamorigrightforearm"],
  leftUpperLeg: ["leftupleg", "thigh_l", "leg_l", "mixamorigleftupleg"],
  leftLowerLeg: ["leftleg", "calf_l", "shin_l", "mixamorigleftleg"],
  rightUpperLeg: ["rightupleg", "thigh_r", "leg_r", "mixamorigrightupleg"],
  rightLowerLeg: ["rightleg", "calf_r", "shin_r", "mixamorigrightleg"],
  spine: ["spine", "chest", "torso", "mixamorigspine"],
  hips: ["hips", "pelvis", "root", "mixamorighips"],
};

export function findBones(root: THREE.Object3D): Map<BoneKey, THREE.Bone> {
  const map = new Map<BoneKey, THREE.Bone>();
  root.traverse((obj) => {
    if (!(obj as THREE.Bone).isBone) return;
    const bone = obj as THREE.Bone;
    const n = bone.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [key, patterns] of Object.entries(PATTERNS) as [
      BoneKey,
      string[],
    ][]) {
      if (map.has(key)) continue;
      if (patterns.some((p) => n.includes(p.replace(/[^a-z0-9]/g, "")))) {
        map.set(key, bone);
      }
    }
  });
  return map;
}

const prevRotations = new Map<string, THREE.Euler>();

export function applyRigToBones(
  bones: Map<BoneKey, THREE.Bone>,
  rig: RigPose,
  lerp = 0.25
): void {
  const assignments: [BoneKey, number, "x" | "z"][] = [
    ["leftUpperArm", rig.leftUpperArm, "z"],
    ["leftLowerArm", rig.leftLowerArm, "z"],
    ["rightUpperArm", rig.rightUpperArm, "z"],
    ["rightLowerArm", rig.rightLowerArm, "z"],
    ["leftUpperLeg", rig.leftUpperLeg, "x"],
    ["leftLowerLeg", rig.leftLowerLeg, "x"],
    ["rightUpperLeg", rig.rightUpperLeg, "x"],
    ["rightLowerLeg", rig.rightLowerLeg, "x"],
    ["spine", rig.torsoLean, "z"],
  ];

  for (const [key, target, axis] of assignments) {
    const bone = bones.get(key);
    if (!bone) continue;
    const id = bone.uuid;
    let prev = prevRotations.get(id);
    if (!prev) {
      prev = bone.rotation.clone();
      prevRotations.set(id, prev);
    }
    const current = axis === "x" ? bone.rotation.x : bone.rotation.z;
    const next = current + (target - current) * lerp;
    if (axis === "x") bone.rotation.x = next;
    else bone.rotation.z = next;
  }
}

export function clearBoneRotationCache(): void {
  prevRotations.clear();
}
