import type { NormalizedLandmark } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";
import type { BodyScanSample } from "@/lib/calibration/bodyScanPayload";
import { analyzeScanFrame } from "@/lib/calibration/scanAnalysis";

export interface ClothingVerdict {
  likely: boolean;
  confidence: number;
  reasons: string[];
  summary: string;
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

/** Upper-body / laptop heuristics — loose T-shirt, hoodie, etc. */
export function detectClothingFromLandmarks(
  landmarks: NormalizedLandmark[] | null
): ClothingVerdict {
  const frame = analyzeScanFrame(landmarks);
  const reasons: string[] = [];

  if (!landmarks?.length) {
    return {
      likely: false,
      confidence: 0,
      reasons: [],
      summary: "Поза не видна",
    };
  }

  if (frame.clothingLikely && frame.clothingReason) {
    const parsed = frame.clothingReason
      .replace(/^Обнаружена одежда:\s*/, "")
      .replace(/\.\s*Для точности.*/, "")
      .split(", ")
      .filter(Boolean);
    reasons.push(...parsed);
  }

  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const le = landmarks[LM.L_ELBOW];
  const re = landmarks[LM.R_ELBOW];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];

  const shoulderW = dist(ls, rs);
  const hipW = dist(lh, rh);
  const shoulderVis = (vis(ls) + vis(rs)) / 2;
  const hipVis = (vis(lh) + vis(rh)) / 2;
  const elbowVis = (vis(le) + vis(re)) / 2;
  const wristVis = (vis(lw) + vis(rw)) / 2;

  const shoulderMid = {
    x: (ls.x + rs.x) / 2,
    y: (ls.y + rs.y) / 2,
    z: 0,
  };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: 0 };
  const torsoH = dist(shoulderMid, hipMid);

  if (torsoH > 0.02 && shoulderW / torsoH > 0.58) {
    reasons.push("объёмный торс (вероятна футболка)");
  }
  if (shoulderW > 0.26 && shoulderVis > 0.45) {
    reasons.push("широкий силуэт в кадре");
  }
  if (hipW > 0.01 && shoulderW / hipW < 0.88) {
    reasons.push("толстовка/свободная верхняя одежда");
  }
  if (shoulderVis > 0.5 && elbowVis < shoulderVis - 0.12) {
    reasons.push("рукава закрывают руки");
  }
  if (shoulderVis > 0.45 && wristVis < 0.35 && elbowVis > 0.35) {
    reasons.push("длинные рукава");
  }

  const unique = [...new Set(reasons)];
  const likely = unique.length >= 1;
  const confidence = Math.min(
    1,
    unique.length * 0.22 + (frame.clothingLikely ? 0.35 : 0)
  );

  const summary = likely
    ? `Обнаружена одежда: ${unique.join(", ")}. Для точности — облегающая форма или голый торс.`
    : "Силуэт без явной одежды — подходит для скана";

  return {
    likely,
    confidence,
    reasons: unique,
    summary,
  };
}

/** Vote across scan samples — silhouette metrics from JSON. */
export function detectClothingFromScanSummary(
  samples: BodyScanSample[],
  profileHeightCm: number
): ClothingVerdict {
  if (samples.length < 4) {
    return {
      likely: false,
      confidence: 0,
      reasons: [],
      summary: "Мало данных для одежды",
    };
  }

  const reasons: string[] = [];
  const avgShoulder = samples.reduce((s, x) => s + x.shoulderWidth, 0) / samples.length;
  const avgHip = samples.reduce((s, x) => s + x.hipWidth, 0) / samples.length;

  const expectedShoulderNorm =
    profileHeightCm >= 178 ? 0.27 : profileHeightCm >= 170 ? 0.25 : 0.23;

  if (avgShoulder > expectedShoulderNorm * 1.12) {
    reasons.push("плечи шире нормы (свободная одежда)");
  }
  if (avgHip > 0.01 && avgShoulder / avgHip < 0.92) {
    reasons.push("расширенный торс относительно бёдер");
  }

  const hipWidePhases = samples.filter(
    (s) => s.hipWidth > avgShoulder * 0.95
  ).length;
  if (hipWidePhases / samples.length > 0.35) {
    reasons.push("объёмный силуэт по фазам скана");
  }

  const unique = [...new Set(reasons)];
  const likely = unique.length >= 1;
  const confidence = Math.min(0.85, unique.length * 0.3);

  return {
    likely,
    confidence,
    reasons: unique,
    summary: likely
      ? `По силуэту скана: ${unique.join(", ")}`
      : "Силуэт скана без признаков одежды",
  };
}

export function mergeClothingVerdicts(
  ...verdicts: (ClothingVerdict | null | undefined)[]
): ClothingVerdict {
  const valid = verdicts.filter(Boolean) as ClothingVerdict[];
  if (!valid.length) {
    return {
      likely: false,
      confidence: 0,
      reasons: [],
      summary: "Одежда не анализировалась",
    };
  }

  const allReasons = [...new Set(valid.flatMap((v) => v.reasons))];
  const maxConf = Math.max(...valid.map((v) => v.confidence));
  const votes = valid.filter((v) => v.likely).length;
  const likely = votes >= 1 || allReasons.length >= 2;

  const confidence = likely
    ? Math.min(1, maxConf + votes * 0.15)
    : maxConf * 0.3;

  return {
    likely,
    confidence,
    reasons: allReasons,
    summary: likely
      ? `Обнаружена одежда: ${allReasons.join(", ")}. Состав тела завышен — пересканируйте в облегающей форме.`
      : valid[valid.length - 1]?.summary ?? "Одежда не обнаружена",
  };
}
