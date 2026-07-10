import type { BodyScanJson } from "@/lib/calibration/bodyScanPayload";
import type { ScanAnalysis } from "@/lib/calibration/scanAnalysis";
import type { BodyAnthropometrics } from "@/lib/bio/anthropometry";

export type BioScanTier = "low" | "medium" | "high";

export interface BioScanQuality {
  score: number;
  tier: BioScanTier;
  issues: string[];
  multiViewOk: boolean;
  clothingPenalty: boolean;
  anthropometryConfidence: BodyAnthropometrics["confidence"] | "none";
}

function tierFromScore(score: number): BioScanTier {
  if (score >= 78) return "high";
  if (score >= 52) return "medium";
  return "low";
}

export function evaluateScanQuality(
  scan: BodyScanJson,
  frameAnalysis?: ScanAnalysis | null,
  viewsCaptured?: string[]
): BioScanQuality {
  const issues: string[] = [];
  let score = 40;

  const s = scan.summary;
  if (s.sampleCount >= 24) score += 12;
  else issues.push("Мало кадров скана");

  if (s.lowerVisibility >= 0.35) score += 6;

  if (s.upperVisibility >= 0.55) score += 12;
  else issues.push("Верх тела плохо виден");

  if (s.armsRaisedRatio >= 0.25) score += 8;
  else issues.push("Поднимите руки в кадр");

  const views = viewsCaptured ?? scan.views ?? [];
  const multiViewOk =
    views.includes("front") &&
    (views.includes("side") || views.includes("back"));
  if (multiViewOk) score += 16;
  else if (views.includes("front")) score += 6;
  else issues.push("Нужен фронт и профиль");

  const hasProfilePhases = scan.phases.some((p) =>
    ["turn_left", "turn_right", "rotate_360"].includes(p)
  );
  if (hasProfilePhases) score += 10;
  else issues.push("Нет поворотов для профиля");

  if (scan.anthropometrics?.confidence === "high") score += 10;
  else if (scan.anthropometrics?.confidence === "medium") score += 5;
  else if (!scan.anthropometrics) issues.push("Антропометрия не рассчитана");

  let clothingPenalty = false;
  if (frameAnalysis?.clothingLikely) {
    clothingPenalty = true;
    score -= 12;
    issues.push("Одежда мешает точности");
  }

  if (frameAnalysis && !frameAnalysis.fullBodyOk && s.lowerVisibility < 0.35) {
    score -= 4;
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: clamped,
    tier: tierFromScore(clamped),
    issues: [...new Set(issues)],
    multiViewOk,
    clothingPenalty,
    anthropometryConfidence: scan.anthropometrics?.confidence ?? "none",
  };
}
