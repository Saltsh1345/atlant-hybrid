/** Per-device distance calibration (shoulder width ↔ meters). */
export interface CameraCalibration {
  deviceId: string;
  label: string;
  /** Shoulder span in normalized frame at refDistanceM */
  refShoulderNorm: number;
  refDistanceM: number;
  source: "factory" | "arm_reach" | "manual";
  calibratedAt: number;
  /** Owner stature for geometry (cm) */
  userHeightCm?: number;
  /** Preferred training distance (m) */
  targetIdealM?: number;
  targetMinM?: number;
  targetMaxM?: number;
}

/**
 * Huawei MateBook 14 (2025) — user Arman: 182 cm, 60–70 cm to screen.
 * Webcam top bezel, ~88° FOV.
 */
export const MATEBOOK_14_2025: CameraCalibration = {
  deviceId: "huawei-matebook-14-2025",
  label: "Huawei MateBook 14 (2025)",
  refShoulderNorm: 0.29,
  refDistanceM: 0.65,
  source: "factory",
  calibratedAt: 0,
  userHeightCm: 182,
  targetIdealM: 0.65,
  targetMinM: 0.55,
  targetMaxM: 0.8,
};

/** Fingertips touch screen ≈ camera ↔ chest (MateBook lid angle). */
export const ARM_REACH_DISTANCE_M = 0.52;

export function defaultCalibrationForDevice(): CameraCalibration {
  return { ...MATEBOOK_14_2025, calibratedAt: Date.now() };
}

export function isStaleCalibration(cal: CameraCalibration | null): boolean {
  if (!cal) return true;
  if (cal.deviceId !== MATEBOOK_14_2025.deviceId) return false;
  return (cal.refDistanceM ?? 0) > 0.95 || (cal.targetIdealM ?? 1) > 0.95;
}

export function safeHeightCm(heightCm?: number, cal?: CameraCalibration | null): number {
  const h = heightCm ?? cal?.userHeightCm;
  if (!h || h < 150 || h > 205) return cal?.userHeightCm ?? 175;
  return h;
}

export function distanceTargets(
  cal: CameraCalibration | null | undefined,
  kind: "laptop" | "phone" | "tablet"
): { targetMin: number; targetMax: number; targetIdeal: number } {
  if (cal?.targetIdealM) {
    return {
      targetMin: cal.targetMinM ?? cal.targetIdealM - 0.1,
      targetMax: cal.targetMaxM ?? cal.targetIdealM + 0.15,
      targetIdeal: cal.targetIdealM,
    };
  }
  if (kind === "laptop") {
    return { targetMin: 0.55, targetMax: 0.8, targetIdeal: 0.65 };
  }
  return { targetMin: 1.4, targetMax: 2.8, targetIdeal: 2.0 };
}

export function formatDistance(meters: number): string {
  if (meters < 1.15) return `~${Math.round(meters * 100)} см`;
  return `~${meters} м`;
}

export function distanceFromCalibration(
  shoulderW: number,
  cal: CameraCalibration,
  heightCm?: number
): number {
  const w = Math.max(shoulderW, 0.05);
  let meters = cal.refDistanceM * (cal.refShoulderNorm / w);

  const h = safeHeightCm(heightCm, cal);
  const shoulderM = (h / 100) * 0.259;
  const refH = cal.userHeightCm ?? 175;
  const refShoulderM = (refH / 100) * 0.259;
  meters *= shoulderM / refShoulderM;

  return Math.round(meters * 100) / 100;
}

export function buildArmReachCalibration(
  shoulderSamples: number[],
  label = MATEBOOK_14_2025.label
): CameraCalibration | null {
  const valid = shoulderSamples.filter((s) => s > 0.08 && s < 0.5);
  if (valid.length < 8) return null;

  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  return {
    ...MATEBOOK_14_2025,
    label,
    refShoulderNorm: Math.round(median * 1000) / 1000,
    refDistanceM: ARM_REACH_DISTANCE_M,
    source: "arm_reach",
    calibratedAt: Date.now(),
  };
}
