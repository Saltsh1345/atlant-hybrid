import {
  estimateAnthropometrics,
  type BodyAnthropometrics,
} from "@/lib/bio/anthropometry";
import type { NormalizedLandmark } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";

/** Stable body ratios — used to re-verify the same person later. */
export interface BodyBioSignature {
  shoulderToHip: number;
  armSpanToHeight: number;
  torsoToHeight: number;
  legToHeight: number;
  /** Short fingerprint for storage / comparison */
  hash: string;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).padStart(8, "0").slice(0, 8);
}

export function buildBodySignature(
  anthropometrics: BodyAnthropometrics
): BodyBioSignature {
  const h = anthropometrics.statureCm;
  const shoulderToHip =
    anthropometrics.hipWidthCm > 0
      ? anthropometrics.shoulderWidthCm / anthropometrics.hipWidthCm
      : 1;
  const armSpanToHeight = anthropometrics.armSpanCm / h;
  const torsoToHeight = anthropometrics.torsoLengthCm / h;
  const legToHeight = anthropometrics.upperLegCm / h;

  const payload = [
    round4(shoulderToHip),
    round4(armSpanToHeight),
    round4(torsoToHeight),
    round4(legToHeight),
  ].join("|");

  return {
    shoulderToHip: round4(shoulderToHip),
    armSpanToHeight: round4(armSpanToHeight),
    torsoToHeight: round4(torsoToHeight),
    legToHeight: round4(legToHeight),
    hash: simpleHash(payload),
  };
}

export function buildSignatureFromLandmarks(
  landmarks: NormalizedLandmark[] | null,
  heightCm: number
): BodyBioSignature | null {
  const m = estimateAnthropometrics(landmarks, heightCm);
  if (!m) return null;
  return buildBodySignature(m);
}

export interface BodyMatchResult {
  match: boolean;
  score: number;
  hint: string;
}

/** Compare live pose to latched scan signature (training-time bio-check). */
export function verifyBodyMatch(
  landmarks: NormalizedLandmark[] | null,
  heightCm: number,
  latched: BodyBioSignature,
  minScore = 0.72
): BodyMatchResult {
  if (!landmarks?.length) {
    return { match: false, score: 0, hint: "Тело не в кадре" };
  }

  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];
  const nose = landmarks[LM.NOSE];

  const top = Math.min(nose.y, ls.y, rs.y);
  const bottom = Math.max(la.y, ra.y);
  const span = bottom - top;
  if (span < 0.25) {
    return { match: false, score: 0.2, hint: "Недостаточно тела в кадре" };
  }

  const cmPerNorm = heightCm / span;
  const shoulderW = dist(ls, rs) * cmPerNorm;
  const hipW = dist(lh, rh) * cmPerNorm;
  const armSpan =
    (dist(lw, rw) + dist(ls, lw) * 0.5 + dist(rs, rw) * 0.5) * cmPerNorm;
  const torso =
    dist(
      { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: 0 },
      { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: 0 }
    ) * cmPerNorm;
  const leg =
    (dist(lh, landmarks[LM.L_KNEE]) +
      dist(landmarks[LM.L_KNEE], la) +
      dist(rh, landmarks[LM.R_KNEE]) +
      dist(landmarks[LM.R_KNEE], ra)) /
    2 *
    cmPerNorm;

  const live = buildBodySignature({
    statureCm: heightCm,
    shoulderWidthCm: shoulderW,
    chestWidthCm: shoulderW * 0.92,
    waistWidthCm: shoulderW * 0.75,
    hipWidthCm: hipW,
    armSpanCm: armSpan,
    torsoLengthCm: torso,
    upperLegCm: leg,
    confidence: "medium",
  });

  const diffs = [
    Math.abs(live.shoulderToHip - latched.shoulderToHip) / latched.shoulderToHip,
    Math.abs(live.armSpanToHeight - latched.armSpanToHeight) /
      latched.armSpanToHeight,
    Math.abs(live.torsoToHeight - latched.torsoToHeight) / latched.torsoToHeight,
    Math.abs(live.legToHeight - latched.legToHeight) / latched.legToHeight,
  ];
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const score = Math.max(0, Math.min(1, 1 - avgDiff * 2.2));

  return {
    match: score >= minScore,
    score: Math.round(score * 100) / 100,
    hint:
      score >= minScore
        ? "Совпадение с биопрофилем скана"
        : "Пропорции не совпадают с зафиксированным сканом — проверьте позицию",
  };
}
