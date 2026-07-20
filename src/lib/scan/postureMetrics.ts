import type { NormalizedLandmark } from "@/types";
import { LM, angle } from "@/lib/pose/landmarks";

export interface ScanFrameSize {
  width: number;
  height: number;
}

export interface SegmentEstimate {
  pixels: number;
  centimeters: number;
}

export interface ScanSegmentLengths {
  forearm: SegmentEstimate;
  thigh: SegmentEstimate;
}

export interface SidePostureMetrics {
  hipAngleDeg: number;
  kneeAngleDeg: number;
  pelvicDeviationDeg: number;
  hyperlordosisLikely: boolean;
  confidence: "low" | "medium" | "high";
  note: string;
}

function visibility(landmark: NormalizedLandmark) {
  return landmark.visibility ?? 0;
}

function pixelDistance(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  frame: ScanFrameSize,
) {
  return Math.hypot(
    (a.x - b.x) * frame.width,
    (a.y - b.y) * frame.height,
  );
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function averageVisibleSegment(
  landmarks: NormalizedLandmark[],
  pairs: ReadonlyArray<readonly [number, number]>,
  frame: ScanFrameSize,
) {
  const values = pairs
    .filter(
      ([a, b]) =>
        visibility(landmarks[a]) >= 0.45 &&
        visibility(landmarks[b]) >= 0.45,
    )
    .map(([a, b]) => pixelDistance(landmarks[a], landmarks[b], frame));

  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function estimateScanSegments(
  landmarks: NormalizedLandmark[],
  statureCm: number,
  frame: ScanFrameSize,
): ScanSegmentLengths | null {
  if (
    landmarks.length < 29 ||
    statureCm < 140 ||
    statureCm > 220 ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    return null;
  }

  const bodyTop = Math.min(
    landmarks[LM.NOSE].y,
    landmarks[LM.L_SHOULDER].y,
    landmarks[LM.R_SHOULDER].y,
  );
  const bodyBottom = Math.max(
    landmarks[LM.L_ANKLE].y,
    landmarks[LM.R_ANKLE].y,
  );
  const bodyHeightPx = (bodyBottom - bodyTop) * frame.height;
  if (bodyHeightPx < frame.height * 0.42) return null;

  const forearmPx = averageVisibleSegment(
    landmarks,
    [
      [LM.L_ELBOW, LM.L_WRIST],
      [LM.R_ELBOW, LM.R_WRIST],
    ],
    frame,
  );
  const thighPx = averageVisibleSegment(
    landmarks,
    [
      [LM.L_HIP, LM.L_KNEE],
      [LM.R_HIP, LM.R_KNEE],
    ],
    frame,
  );
  if (forearmPx == null || thighPx == null) return null;

  const cmPerPixel = statureCm / bodyHeightPx;

  return {
    forearm: {
      pixels: round(forearmPx),
      centimeters: round(forearmPx * cmPerPixel),
    },
    thigh: {
      pixels: round(thighPx),
      centimeters: round(thighPx * cmPerPixel),
    },
  };
}

export function analyzeSidePosture(
  landmarks: NormalizedLandmark[],
): SidePostureMetrics | null {
  if (landmarks.length < 29) return null;

  const leftScore =
    visibility(landmarks[LM.L_SHOULDER]) +
    visibility(landmarks[LM.L_HIP]) +
    visibility(landmarks[LM.L_KNEE]) +
    visibility(landmarks[LM.L_ANKLE]);
  const rightScore =
    visibility(landmarks[LM.R_SHOULDER]) +
    visibility(landmarks[LM.R_HIP]) +
    visibility(landmarks[LM.R_KNEE]) +
    visibility(landmarks[LM.R_ANKLE]);
  const useLeft = leftScore >= rightScore;

  const shoulder = landmarks[
    useLeft ? LM.L_SHOULDER : LM.R_SHOULDER
  ];
  const hip = landmarks[useLeft ? LM.L_HIP : LM.R_HIP];
  const knee = landmarks[useLeft ? LM.L_KNEE : LM.R_KNEE];
  const ankle = landmarks[useLeft ? LM.L_ANKLE : LM.R_ANKLE];
  const minVisibility = Math.min(
    visibility(shoulder),
    visibility(hip),
    visibility(knee),
    visibility(ankle),
  );

  const hipAngleDeg = angle(shoulder, hip, knee);
  const kneeAngleDeg = angle(hip, knee, ankle);
  const pelvicDeviationDeg = Math.abs(180 - hipAngleDeg);
  const standingStraight = kneeAngleDeg >= 155;
  const hyperlordosisLikely =
    minVisibility >= 0.55 &&
    standingStraight &&
    pelvicDeviationDeg >= 14 &&
    pelvicDeviationDeg <= 45;

  const confidence: SidePostureMetrics["confidence"] =
    minVisibility >= 0.75
      ? "high"
      : minVisibility >= 0.55
        ? "medium"
        : "low";

  return {
    hipAngleDeg: round(hipAngleDeg),
    kneeAngleDeg: round(kneeAngleDeg),
    pelvicDeviationDeg: round(pelvicDeviationDeg),
    hyperlordosisLikely,
    confidence,
    note: hyperlordosisLikely
      ? "Выявлен оценочный признак отклонения таза. Это не медицинский диагноз."
      : "Выраженный оценочный признак отклонения таза не выявлен.",
  };
}
