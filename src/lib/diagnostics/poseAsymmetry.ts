import type { NormalizedLandmark } from "@/types";
import type { KinematicSample } from "@/types";
import { LM, angle, dist } from "@/lib/pose/landmarks";

export interface LimbAsymmetry {
  shouldersCm: number;
  hipsCm: number;
  leftKneeAvg: number;
  rightKneeAvg: number;
  kneeAngleDiff: number;
  leftWristVelocity: number;
  rightWristVelocity: number;
  wristVelocityRatio: number;
  notes: string[];
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

/** Асимметрия из одного кадра позы (скан / калибровка). */
export function asymmetryFromLandmarks(
  landmarks: NormalizedLandmark[] | null,
  heightCm: number
): LimbAsymmetry | null {
  if (!landmarks?.length) return null;

  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const nose = landmarks[LM.NOSE];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];

  const top = Math.min(nose.y, ls.y, rs.y);
  const bottom = Math.max(la.y, ra.y, lh.y, rh.y);
  const span = bottom - top;
  if (span < 0.25) return null;

  const cmPerNorm = heightCm / span;
  const shoulderDiff = Math.abs(ls.y - rs.y) * cmPerNorm;
  const hipDiff = Math.abs(lh.y - rh.y) * cmPerNorm;

  const lk = angle(lh, landmarks[LM.L_KNEE], la);
  const rk = angle(rh, landmarks[LM.R_KNEE], ra);

  const notes: string[] = [];
  if (shoulderDiff > 1.2) notes.push(`Плечи: перекос ${shoulderDiff.toFixed(1)} см`);
  if (hipDiff > 1) notes.push(`Таз: перекос ${hipDiff.toFixed(1)} см`);
  if (Math.abs(lk - rk) > 8) notes.push(`Колени: разница углов ${Math.abs(lk - rk).toFixed(0)}°`);

  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];
  const shoulderW = dist(ls, rs);

  return {
    shouldersCm: Math.round(shoulderDiff * 10) / 10,
    hipsCm: Math.round(hipDiff * 10) / 10,
    leftKneeAvg: lk,
    rightKneeAvg: rk,
    kneeAngleDiff: Math.abs(lk - rk),
    leftWristVelocity: 0,
    rightWristVelocity: 0,
    wristVelocityRatio: 1,
    notes,
  };
}

/** Асимметрия скорости и углов по сэмплам тренировки. */
export function asymmetryFromSessionSamples(
  samples: KinematicSample[]
): Pick<
  LimbAsymmetry,
  "kneeAngleDiff" | "wristVelocityRatio" | "notes"
> {
  const notes: string[] = [];
  if (samples.length < 8) {
    return { kneeAngleDiff: 0, wristVelocityRatio: 1, notes };
  }

  const knees = samples.map((s) => s.kneeAngle).filter((k) => k > 40);
  const wristV = samples.map((s) => s.wristVelocityMs).filter((v) => v > 0.5);

  const kneeSpread =
    knees.length > 4
      ? Math.max(...knees) - Math.min(...knees)
      : 0;

  const half = Math.floor(wristV.length / 2);
  const firstHalf = wristV.slice(0, half);
  const secondHalf = wristV.slice(half);
  const avgA =
    firstHalf.reduce((a, b) => a + b, 0) / Math.max(1, firstHalf.length);
  const avgB =
    secondHalf.reduce((a, b) => a + b, 0) / Math.max(1, secondHalf.length);
  const ratio = avgA > 0.01 ? avgB / avgA : 1;

  if (kneeSpread > 25) {
    notes.push("Нестабильная глубина приседа между повторениями");
  }
  if (ratio < 0.75 || ratio > 1.35) {
    notes.push("Падение скорости между половинами подхода — риск усталости");
  }

  return {
    kneeAngleDiff: kneeSpread,
    wristVelocityRatio: Math.round(ratio * 100) / 100,
    notes,
  };
}
