import type { NormalizedLandmark } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";
import {
  detectDeviceKind,
  type DeviceKind,
} from "@/lib/camera/deviceProfile";
import {
  type CameraCalibration,
  distanceFromCalibration,
  distanceTargets,
  formatDistance,
  MATEBOOK_14_2025,
  safeHeightCm,
} from "@/lib/camera/cameraCalibration";
import { getDistanceSmoother } from "@/lib/camera/distanceSmoother";

export interface DistanceEstimate {
  meters: number;
  targetMin: number;
  targetMax: number;
  targetIdeal: number;
  deltaToIdeal: number;
  confidence: "low" | "medium" | "high";
  shoulderWidthNorm: number;
  rawMeters?: number;
}

export function estimateDistanceMeters(
  landmarks: NormalizedLandmark[] | null,
  heightCm: number,
  deviceKind?: DeviceKind,
  calibration?: CameraCalibration | null,
  smooth = true
): DistanceEstimate | null {
  if (!landmarks?.length) return null;

  const kind = deviceKind ?? detectDeviceKind();
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const shoulderW = dist(ls, rs);
  const vis = ((ls.visibility ?? 0) + (rs.visibility ?? 0)) / 2;

  if (shoulderW < 0.04 || vis < 0.35) return null;

  const h = safeHeightCm(heightCm, calibration);
  const cal =
    calibration ??
    ({
      ...MATEBOOK_14_2025,
      refShoulderNorm: kind === "phone" ? 0.17 : kind === "tablet" ? 0.18 : 0.29,
      refDistanceM: kind === "laptop" ? 0.65 : 1.8,
    } satisfies CameraCalibration);

  const rawMeters = distanceFromCalibration(shoulderW, cal, h);

  const smoother = getDistanceSmoother();
  if (smooth) smoother.push(rawMeters);
  const meters = smooth ? smoother.median() ?? rawMeters : rawMeters;
  const rounded =
    meters < 1.15
      ? Math.round(meters * 100) / 100
      : Math.round(meters * 10) / 10;
  const clamped = Math.max(0.4, Math.min(2.5, rounded));

  const { targetMin, targetMax, targetIdeal } = distanceTargets(calibration, kind);
  const deltaToIdeal = Math.round((clamped - targetIdeal) * 100) / 100;

  const confidence: DistanceEstimate["confidence"] =
    vis > 0.65 && shoulderW > 0.08 && (!smooth || smoother.median() !== null)
      ? "high"
      : vis > 0.45
        ? "medium"
        : "low";

  return {
    meters: clamped,
    targetMin,
    targetMax,
    targetIdeal,
    deltaToIdeal,
    confidence,
    shoulderWidthNorm: Math.round(shoulderW * 1000) / 1000,
    rawMeters,
  };
}

function formatRange(min: number, max: number): string {
  if (max < 1.15) return `${Math.round(min * 100)}–${Math.round(max * 100)} см`;
  return `${min}–${max} м`;
}

export function distanceCoachHint(
  est: DistanceEstimate,
  sport?: "boxing" | "tennis" | "strength"
): string {
  const { meters, targetMin, targetMax, targetIdeal } = est;
  const dist = formatDistance(meters);
  const range = formatRange(targetMin, targetMax);
  const stepCm = Math.max(5, Math.round(Math.abs(meters - targetIdeal) * 100));

  if (meters > targetMax + 0.12) {
    return `${dist} — подойдите на ~${stepCm} см ближе (нужно ${range})`;
  }
  if (meters < targetMin - 0.06) {
    return `${dist} — отойдите на ~${stepCm} см (нужно ${range})`;
  }

  if (sport === "boxing" || sport === "tennis") {
    return `${dist} — отлично. Лицом к камере, руки в кадре`;
  }
  return `${dist} — расстояние в норме`;
}

export function distanceStepMeters(est: DistanceEstimate): number | null {
  const { meters, targetMin, targetMax, targetIdeal } = est;
  if (meters > targetMax + 0.05) return -(meters - targetIdeal);
  if (meters < targetMin - 0.05) return targetIdeal - meters;
  return null;
}

export { formatDistance };
