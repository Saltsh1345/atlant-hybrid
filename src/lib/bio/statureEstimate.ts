import type { NormalizedLandmark } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";
import { safeHeightCm } from "@/lib/camera/cameraCalibration";
import { estimateHeightFromPose } from "@/lib/camera/heightEstimator";
import { estimateDistanceMeters } from "@/lib/camera/distanceEstimator";

const BIACROMIAL_RATIO = 0.259;

export interface StatureEstimate {
  heightCm: number;
  confidence: "low" | "medium" | "high";
  source: "full_body" | "shoulders" | "profile";
}

/** Height from shoulder span + distance (works at laptop distance without feet). */
export function estimateHeightFromShoulders(
  landmarks: NormalizedLandmark[] | null,
  distanceM: number,
  calibration?: CameraCalibration | null
): StatureEstimate | null {
  if (!landmarks?.length) return null;

  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const shoulderW = dist(ls, rs);
  const vis = ((ls.visibility ?? 0) + (rs.visibility ?? 0)) / 2;

  if (shoulderW < 0.1 || shoulderW > 0.48 || vis < 0.4) return null;

  const refH = safeHeightCm(calibration?.userHeightCm, calibration);
  const refShoulderM = (refH / 100) * BIACROMIAL_RATIO;
  const cal = calibration ?? {
    refShoulderNorm: 0.29,
    refDistanceM: 0.65,
    userHeightCm: refH,
  };

  const shoulderM =
    refShoulderM *
    (cal.refShoulderNorm / shoulderW) *
    (distanceM / cal.refDistanceM);

  const heightCm = Math.round((shoulderM / BIACROMIAL_RATIO) * 100);
  const clamped = Math.max(155, Math.min(205, heightCm));

  const confidence: StatureEstimate["confidence"] =
    vis > 0.65 && shoulderW > 0.18 && distanceM > 0.45 && distanceM < 1.1
      ? "medium"
      : "low";

  return { heightCm: clamped, confidence, source: "shoulders" };
}

/** Best available stature from scan landmarks. */
export function estimateStatureFromScan(
  landmarks: NormalizedLandmark[] | null,
  profileHeightCm: number,
  calibration?: CameraCalibration | null
): StatureEstimate | null {
  if (!landmarks?.length) return null;

  const dist =
    estimateDistanceMeters(
      landmarks,
      profileHeightCm,
      "laptop",
      calibration,
      false
    )?.meters ?? calibration?.refDistanceM ?? 0.65;

  const full = estimateHeightFromPose(landmarks, dist, calibration);
  if (full) {
    return {
      heightCm: full.heightCm,
      confidence: full.confidence,
      source: "full_body",
    };
  }

  return estimateHeightFromShoulders(landmarks, dist, calibration);
}
