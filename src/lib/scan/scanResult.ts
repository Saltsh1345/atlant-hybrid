import type { NormalizedLandmark } from "@/types";
import type { BodyAnthropometrics } from "@/lib/bio/anthropometry";
import { estimateAnthropometrics } from "@/lib/bio/anthropometry";
import { analyzeScanFrame } from "@/lib/calibration/scanAnalysis";
import {
  analyzeSidePosture,
  estimateScanSegments,
  type ScanFrameSize,
  type ScanSegmentLengths,
  type SidePostureMetrics,
} from "@/lib/scan/postureMetrics";

export interface ScanQualitySummary {
  score: number;
  tier: "low" | "medium" | "high";
  issues: string[];
}

export interface StageTwoScanResult {
  capturedAt: string;
  statureCm: number;
  anthropometrics: BodyAnthropometrics | null;
  segments: ScanSegmentLengths | null;
  posture: SidePostureMetrics | null;
  hyperlordosisLikely: boolean;
  quality: ScanQualitySummary;
  views: {
    front: { fullBodyScore: number; bodyVisibleScore: number };
    side: { fullBodyScore: number; bodyVisibleScore: number };
  };
}

function qualityTier(score: number): ScanQualitySummary["tier"] {
  if (score >= 80) return "high";
  if (score >= 58) return "medium";
  return "low";
}

export function buildStageTwoScanResult({
  frontLandmarks,
  sideLandmarks,
  statureCm,
  frame,
}: {
  frontLandmarks: NormalizedLandmark[];
  sideLandmarks: NormalizedLandmark[];
  statureCm: number;
  frame: ScanFrameSize;
}): StageTwoScanResult {
  const front = analyzeScanFrame(frontLandmarks);
  const side = analyzeScanFrame(sideLandmarks);
  const anthropometrics = estimateAnthropometrics(
    frontLandmarks,
    statureCm,
  );
  const segments = estimateScanSegments(frontLandmarks, statureCm, frame);
  const posture = analyzeSidePosture(sideLandmarks);
  const issues: string[] = [];

  if (!front.fullBodyOk) issues.push("Фронтальный полный рост нестабилен");
  if (!side.fullBodyOk) issues.push("Профильный полный рост нестабилен");
  if (!anthropometrics) issues.push("Антропометрия не рассчитана");
  if (!segments) issues.push("Сегменты конечностей видны недостаточно");
  if (!posture || posture.confidence === "low") {
    issues.push("Низкая уверенность профильной оценки");
  }
  if (front.clothingLikely || side.clothingLikely) {
    issues.push("Одежда может снижать точность");
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        front.fullBodyScore * 40 +
          side.fullBodyScore * 30 +
          (anthropometrics ? 15 : 0) +
          (segments ? 10 : 0) +
          (posture && posture.confidence !== "low" ? 5 : 0) -
          (front.clothingLikely || side.clothingLikely ? 10 : 0),
      ),
    ),
  );

  return {
    capturedAt: new Date().toISOString(),
    statureCm,
    anthropometrics,
    segments,
    posture,
    hyperlordosisLikely: posture?.hyperlordosisLikely ?? false,
    quality: {
      score,
      tier: qualityTier(score),
      issues,
    },
    views: {
      front: {
        fullBodyScore: front.fullBodyScore,
        bodyVisibleScore: front.bodyVisibleScore,
      },
      side: {
        fullBodyScore: side.fullBodyScore,
        bodyVisibleScore: side.bodyVisibleScore,
      },
    },
  };
}
