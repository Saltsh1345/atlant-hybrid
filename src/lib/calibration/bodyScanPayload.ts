import type { NormalizedLandmark, UserProfile } from "@/types";
import { LM, angle, dist } from "@/lib/pose/landmarks";

export interface BodyScanSample {
  t: number;
  phase: string;
  shoulderWidth: number;
  hipWidth: number;
  torsoLean: number;
  spineFlexion: number;
  shoulderHeightDiff: number;
  hipHeightDiff: number;
  leftKneeAngle: number;
  rightKneeAngle: number;
  armsRaised: boolean;
  upperVisible: number;
  lowerVisible: number;
}

export interface BodyScanJson {
  version: 1;
  capturedAt: string;
  profile: {
    height: number;
    weight: number;
    age: number;
    goal: string;
  };
  camera: "laptop_webcam";
  phases: string[];
  samples: BodyScanSample[];
  summary: {
    sampleCount: number;
    avgShoulderWidth: number;
    avgTorsoLean: number;
    avgSpineFlexion: number;
    avgShoulderAsymmetry: number;
    avgHipAsymmetry: number;
    minKneeAngle: number;
    armsRaisedRatio: number;
    upperVisibility: number;
    lowerVisibility: number;
  };
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

function sampleFromLandmarks(
  landmarks: NormalizedLandmark[],
  phase: string
): BodyScanSample {
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];
  const nose = landmarks[LM.NOSE];

  const shoulderMidY = (ls.y + rs.y) / 2;
  const hipMidY = (lh.y + rh.y) / 2;
  const wristMidY = (lw.y + rw.y) / 2;

  const leftKnee = angle(
    landmarks[LM.L_HIP],
    landmarks[LM.L_KNEE],
    landmarks[LM.L_ANKLE]
  );
  const rightKnee = angle(
    landmarks[LM.R_HIP],
    landmarks[LM.R_KNEE],
    landmarks[LM.R_ANKLE]
  );

  const upperVisible =
    (vis(nose) + vis(ls) + vis(rs) + vis(lw) + vis(rw)) / 5;
  const lowerVisible =
    (vis(lh) +
      vis(rh) +
      vis(landmarks[LM.L_KNEE]) +
      vis(landmarks[LM.R_KNEE]) +
      vis(landmarks[LM.L_ANKLE]) +
      vis(landmarks[LM.R_ANKLE])) /
    6;

  return {
    t: Date.now(),
    phase,
    shoulderWidth: dist(ls, rs),
    hipWidth: dist(lh, rh),
    torsoLean: (lh.x + rh.x) / 2 - (ls.x + rs.x) / 2,
    spineFlexion: Math.abs(shoulderMidY - hipMidY),
    shoulderHeightDiff: Math.abs(ls.y - rs.y),
    hipHeightDiff: Math.abs(lh.y - rh.y),
    leftKneeAngle: leftKnee,
    rightKneeAngle: rightKnee,
    armsRaised: wristMidY < shoulderMidY - 0.04,
    upperVisible,
    lowerVisible,
  };
}

export function pushBodyScanSample(
  samples: BodyScanSample[],
  landmarks: NormalizedLandmark[] | null,
  phase: string,
  maxSamples = 80
): void {
  if (!landmarks || landmarks.length < 29) return;
  samples.push(sampleFromLandmarks(landmarks, phase));
  if (samples.length > maxSamples) samples.shift();
}

export function buildBodyScanJson(
  profile: UserProfile,
  samples: BodyScanSample[]
): BodyScanJson {
  const n = samples.length || 1;
  const avg = (fn: (s: BodyScanSample) => number) =>
    samples.reduce((a, s) => a + fn(s), 0) / n;

  const phases = [...new Set(samples.map((s) => s.phase))];

  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    profile: {
      height: profile.height,
      weight: profile.weight,
      age: profile.age,
      goal: profile.goal ?? "maintain",
    },
    camera: "laptop_webcam",
    phases,
    samples,
    summary: {
      sampleCount: samples.length,
      avgShoulderWidth: avg((s) => s.shoulderWidth),
      avgTorsoLean: avg((s) => s.torsoLean),
      avgSpineFlexion: avg((s) => s.spineFlexion),
      avgShoulderAsymmetry: avg((s) => s.shoulderHeightDiff),
      avgHipAsymmetry: avg((s) => s.hipHeightDiff),
      minKneeAngle: samples.length
        ? Math.min(...samples.map((s) => Math.min(s.leftKneeAngle, s.rightKneeAngle)))
        : 180,
      armsRaisedRatio: avg((s) => (s.armsRaised ? 1 : 0)),
      upperVisibility: avg((s) => s.upperVisible),
      lowerVisibility: avg((s) => s.lowerVisible),
    },
  };
}
