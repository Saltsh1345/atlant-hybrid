import type { NormalizedLandmark } from "@/types";
import { LM, angle, dist } from "@/lib/pose/landmarks";

/** Linear body dimensions estimated from pose + known stature (cm). */
export interface BodyAnthropometrics {
  statureCm: number;
  shoulderWidthCm: number;
  chestWidthCm: number;
  waistWidthCm: number;
  hipWidthCm: number;
  armSpanCm: number;
  torsoLengthCm: number;
  upperLegCm: number;
  confidence: "low" | "medium" | "high";
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

function mid(a: NormalizedLandmark, b: NormalizedLandmark): NormalizedLandmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(vis(a), vis(b)),
  };
}

/**
 * Monocular anthropometry: scale normalized landmarks by user height and body span.
 * Not clinical — useful for progress tracking and bio-signature.
 */
export function estimateAnthropometrics(
  landmarks: NormalizedLandmark[] | null,
  heightCm: number
): BodyAnthropometrics | null {
  if (!landmarks?.length || heightCm < 140 || heightCm > 220) return null;

  const nose = landmarks[LM.NOSE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];
  const lk = landmarks[LM.L_KNEE];
  const rk = landmarks[LM.R_KNEE];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];

  const top = Math.min(nose.y, ls.y, rs.y);
  const bottom = Math.max(la.y, ra.y, lh.y, rh.y);
  const spanNorm = bottom - top;
  if (spanNorm < 0.32) return null;

  const cmPerNorm = heightCm / spanNorm;
  const shoulderMid = mid(ls, rs);
  const hipMid = mid(lh, rh);
  const waistMid = mid(shoulderMid, hipMid);

  const shoulderW = dist(ls, rs);
  const hipW = dist(lh, rh);
  const waistW = shoulderW * 0.72 + hipW * 0.28;

  const armSpan =
    dist(lw, rw) +
    dist(ls, lw) * 0.5 +
    dist(rs, rw) * 0.5;

  const torsoLen = dist(shoulderMid, hipMid);
  const legLen =
    (dist(lh, lk) + dist(lk, la) + dist(rh, rk) + dist(rk, ra)) / 2;

  const visScore =
    (vis(nose) +
      vis(ls) +
      vis(rs) +
      vis(lh) +
      vis(rh) +
      vis(la) +
      vis(ra)) /
    7;

  const confidence: BodyAnthropometrics["confidence"] =
    visScore > 0.65 && spanNorm > 0.5
      ? "high"
      : visScore > 0.45
        ? "medium"
        : "low";

  const round = (n: number) => Math.round(n * 10) / 10;

  return {
    statureCm: heightCm,
    shoulderWidthCm: round(shoulderW * cmPerNorm),
    chestWidthCm: round(shoulderW * 0.92 * cmPerNorm),
    waistWidthCm: round(waistW * cmPerNorm),
    hipWidthCm: round(hipW * cmPerNorm),
    armSpanCm: round(armSpan * cmPerNorm),
    torsoLengthCm: round(torsoLen * cmPerNorm),
    upperLegCm: round(legLen * cmPerNorm),
    confidence,
  };
}

/** Body view from shoulder depth asymmetry (MediaPipe z proxy). */
export function classifyBodyView(
  landmarks: NormalizedLandmark[] | null
): "front" | "side" | "back" | "unknown" {
  if (!landmarks?.length) return "unknown";
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const depth = ls.z - rs.z;
  const w = dist(ls, rs);
  if (w < 0.06) return "unknown";
  const ratio = depth / w;
  if (Math.abs(ratio) < 0.12) return "front";
  if (ratio > 0.2) return "side";
  if (ratio < -0.2) return "back";
  return "unknown";
}

export function kneeFlexionDeg(landmarks: NormalizedLandmark[]): number {
  const left =
    (landmarks[LM.L_HIP].visibility ?? 0) +
    (landmarks[LM.L_KNEE].visibility ?? 0);
  const right =
    (landmarks[LM.R_HIP].visibility ?? 0) +
    (landmarks[LM.R_KNEE].visibility ?? 0);
  if (left >= right) {
    return angle(
      landmarks[LM.L_HIP],
      landmarks[LM.L_KNEE],
      landmarks[LM.L_ANKLE]
    );
  }
  return angle(
    landmarks[LM.R_HIP],
    landmarks[LM.R_KNEE],
    landmarks[LM.R_ANKLE]
  );
}
