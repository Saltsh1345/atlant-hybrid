import { defaultFatZones } from "@/lib/body/fatZones";
import type { LatchedBodyData, UserProfile } from "@/types";
import type { ScanAnalysis } from "@/lib/calibration/scanAnalysis";

/**
 * Simulates body composition ONCE from anthropometrics + scan heuristics.
 * Called only during calibration latch — never per frame.
 */
export function simulateBodyComposition(
  profile: UserProfile,
  scan?: ScanAnalysis | null
): LatchedBodyData {
  const bmi = profile.weight / Math.pow(profile.height / 100, 2);
  const ageFactor = Math.min(1.15, 1 + (profile.age - 25) * 0.005);

  const goal = profile.goal ?? "maintain";
  let fatPercent = 12 + (bmi - 22) * 1.8 * ageFactor;
  if (goal === "lose_weight") fatPercent += 3;
  if (goal === "gain_muscle") fatPercent -= 2;
  fatPercent = Math.max(8, Math.min(38, fatPercent));

  let musclePercent = Math.max(32, 100 - fatPercent - 18);
  if (goal === "gain_muscle") musclePercent += 4;
  if (goal === "performance") musclePercent += 2;

  if (scan?.clothingLikely) {
    fatPercent = Math.min(38, fatPercent + 2.5);
    musclePercent = Math.max(32, musclePercent - 1.5);
  }
  if (scan && scan.bodyVisibleScore < 0.65) {
    fatPercent = Math.min(38, fatPercent + 1);
  }

  const fatMassKg = (profile.weight * fatPercent) / 100;
  const leanMassKg = profile.weight - fatMassKg;

  let scanNote: string | undefined;
  if (scan?.clothingLikely) {
    scanNote = scan.clothingReason;
  } else if (scan && !scan.poseVisible) {
    scanNote = "Скан при неполной видимости тела — оценка приблизительная";
  }

  const roundedFat = Math.round(fatPercent * 10) / 10;

  return {
    fatPercent: roundedFat,
    musclePercent: Math.round(musclePercent * 10) / 10,
    leanMassKg: Math.round(leanMassKg * 10) / 10,
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    totalWeightKg: Math.round(profile.weight * 10) / 10,
    heightCm: profile.height,
    heightSource: "profile",
    lockedAt: new Date().toISOString(),
    clothingDetected: scan?.clothingLikely ?? false,
    clothingReason: scanNote,
    scanNote,
    fatZones: defaultFatZones(roundedFat),
    source: "local",
  };
}
