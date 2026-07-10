import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";
import { safeHeightCm } from "@/lib/camera/cameraCalibration";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";
import { estimateDistanceMeters } from "@/lib/camera/distanceEstimator";

/** Full-body height from pose span × distance (monocular; only when head + feet visible). */
export function estimateHeightFromPose(
  landmarks: NormalizedLandmark[] | null,
  distanceM?: number,
  calibration?: CameraCalibration | null
): { heightCm: number; confidence: "low" | "medium" | "high" } | null {
  if (!landmarks?.length) return null;

  const nose = landmarks[LM.NOSE];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];

  const headVis = nose.visibility ?? 0;
  const feetVis = Math.max(la.visibility ?? 0, ra.visibility ?? 0);
  const shoulderVis = ((ls.visibility ?? 0) + (rs.visibility ?? 0)) / 2;

  if (headVis < 0.55 || feetVis < 0.45 || shoulderVis < 0.45) return null;
  if (nose.y > 0.35) return null;

  const top = Math.min(nose.y, ls.y, rs.y);
  const bottom = Math.max(la.y, ra.y);
  const bodySpan = bottom - top;

  if (bodySpan < 0.55 || bodySpan > 0.88) return null;

  const dist =
    distanceM ??
    estimateDistanceMeters(landmarks, calibration?.userHeightCm ?? 175, undefined, calibration, false)
      ?.meters ??
    1.2;

  const refHeight = calibration?.userHeightCm ?? 175;
  const refDist = calibration?.targetIdealM ?? 0.65;
  const refSpan = 0.68;
  const heightCm = Math.round((bodySpan / refSpan) * (dist / refDist) * refHeight);
  const clamped = Math.max(150, Math.min(205, heightCm));

  const confidence: "low" | "medium" | "high" =
    bodySpan > 0.65 && feetVis > 0.55 && headVis > 0.65 && nose.y < 0.25
      ? "high"
      : bodySpan > 0.58
        ? "medium"
        : "low";

  if (confidence === "low") return null;

  return { heightCm: clamped, confidence };
}
