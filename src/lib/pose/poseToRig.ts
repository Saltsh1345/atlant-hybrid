import type { NormalizedLandmark } from "@/types";
import { LM, angle } from "./landmarks";

/** Radians for procedural avatar limb rotations (Y-axis, mirrored view). */
export interface RigPose {
  leftUpperArm: number;
  leftLowerArm: number;
  rightUpperArm: number;
  rightLowerArm: number;
  leftUpperLeg: number;
  leftLowerLeg: number;
  rightUpperLeg: number;
  rightLowerLeg: number;
  torsoLean: number;
}

const DEG = Math.PI / 180;

function limbRot(
  proximal: NormalizedLandmark,
  joint: NormalizedLandmark,
  distal: NormalizedLandmark
): number {
  const a = angle(proximal, joint, distal);
  return (180 - a) * DEG;
}

function upperLimb(
  shoulder: NormalizedLandmark,
  elbow: NormalizedLandmark,
  wrist: NormalizedLandmark
): [number, number] {
  const upper = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
  const lower = limbRot(shoulder, elbow, wrist);
  return [upper, lower];
}

function lowerLimb(
  hip: NormalizedLandmark,
  knee: NormalizedLandmark,
  ankle: NormalizedLandmark
): [number, number] {
  const upper = Math.atan2(knee.y - hip.y, knee.x - hip.x) - Math.PI / 2;
  const lower = limbRot(hip, knee, ankle);
  return [upper, lower];
}

export function landmarksToRig(
  landmarks: NormalizedLandmark[] | null
): RigPose | null {
  if (!landmarks || landmarks.length < 29) return null;

  const ls = landmarks[LM.L_SHOULDER];
  const le = landmarks[LM.L_ELBOW];
  const lw = landmarks[LM.L_WRIST];
  const rs = landmarks[LM.R_SHOULDER];
  const re = landmarks[LM.R_ELBOW];
  const rw = landmarks[LM.R_WRIST];
  const lh = landmarks[LM.L_HIP];
  const lk = landmarks[LM.L_KNEE];
  const la = landmarks[LM.L_ANKLE];
  const rh = landmarks[LM.R_HIP];
  const rk = landmarks[LM.R_KNEE];
  const ra = landmarks[LM.R_ANKLE];

  const [lua, lla] = upperLimb(ls, le, lw);
  const [rua, rla] = upperLimb(rs, re, rw);
  const [lul, lll] = lowerLimb(lh, lk, la);
  const [rul, rll] = lowerLimb(rh, rk, ra);

  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: 0 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: 0 };
  const torsoLean =
    Math.atan2(shoulderMid.x - hipMid.x, hipMid.y - shoulderMid.y) * 0.6;

  return {
    leftUpperArm: -lua,
    leftLowerArm: -lla,
    rightUpperArm: rua,
    rightLowerArm: rla,
    leftUpperLeg: -lul,
    leftLowerLeg: -lll,
    rightUpperLeg: rul,
    rightLowerLeg: rll,
    torsoLean,
  };
}
