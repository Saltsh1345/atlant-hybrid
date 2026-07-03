import type { NormalizedLandmark } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";

export interface ScanAnalysis {
  poseVisible: boolean;
  clothingLikely: boolean;
  clothingReason: string;
  bodyVisibleScore: number;
  fullBodyOk: boolean;
  fullBodyReason: string;
  fullBodyScore: number;
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function fullBodyProgress(
  landmarks: NormalizedLandmark[] | null
): { score: number; ok: boolean; reason: string } {
  if (!landmarks || landmarks.length < 29) {
    return { score: 0, ok: false, reason: "Встаньте в кадр целиком" };
  }

  const nose = landmarks[LM.NOSE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const lk = landmarks[LM.L_KNEE];
  const rk = landmarks[LM.R_KNEE];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];

  const headVis = vis(nose);
  const shoulderVis = (vis(ls) + vis(rs)) / 2;
  const hipVis = (vis(lh) + vis(rh)) / 2;
  const kneeVis = (vis(lk) + vis(rk)) / 2;
  const feetVis = (vis(la) + vis(ra)) / 2;

  const shoulderW = dist(ls, rs);
  const ankleY = Math.max(la.y, ra.y);
  const bodyTop = Math.min(nose.y, ls.y, rs.y);
  const bodySpan = ankleY - bodyTop;

  const headDetected = headVis > 0.35 && shoulderVis > 0.35;
  const headScore = clamp01(headVis / 0.7) * (headDetected ? 1 : 0);

  const feetDetected = feetVis > 0.3 && ankleY > 0.55;
  const feetScore = feetDetected
    ? clamp01((ankleY - 0.55) / 0.3) * clamp01(feetVis / 0.6)
    : clamp01(feetVis / 0.5) * 0.3;

  const spanScore = clamp01((bodySpan - 0.45) / 0.35);

  const distanceOk = shoulderW > 0.08 && shoulderW < 0.32;
  const distanceScore = distanceOk
    ? 1
    : shoulderW >= 0.32
      ? clamp01(1 - (shoulderW - 0.32) / 0.2)
      : clamp01(shoulderW / 0.08);

  const score =
    headScore * 0.25 +
    feetScore * 0.3 +
    spanScore * 0.25 +
    distanceScore * 0.2;

  const ok =
    headDetected &&
    feetDetected &&
    ankleY > 0.62 &&
    bodySpan > 0.48 &&
    shoulderW > 0.08 &&
    shoulderW < 0.34 &&
    score >= 0.72;

  let reason: string;
  if (!headDetected) {
    reason =
      headVis < 0.2
        ? "Голова не в кадре — отодвиньтесь и смотрите в камеру"
        : "Лицо плохо видно — повернитесь к камере";
  } else if (shoulderW >= 0.32) {
    reason = "Слишком близко — отойдите на 1–2 метра, в полный рост";
  } else if (!feetDetected || ankleY < 0.68) {
    reason = "Ступни не видны — отойдите, чтобы был виден рост от головы до ног";
  } else if (bodySpan < 0.55) {
    reason = "В кадре только часть тела — отойдите дальше";
  } else if (shoulderW < 0.09) {
    reason = "Слишком далеко — подойдите ближе";
  } else if (ok) {
    reason = "✓ Полный рост в кадре";
  } else {
    reason = "Держите позу — камера калибрует…";
  }

  return { score: Math.min(1, score), ok, reason };
}

/** Pose + clothing heuristics from a single calibration frame. */
export function analyzeScanFrame(
  landmarks: NormalizedLandmark[] | null
): ScanAnalysis {
  if (!landmarks || landmarks.length < 29) {
    return {
      poseVisible: false,
      clothingLikely: false,
      clothingReason: "Поза не видна — встаньте в кадр целиком",
      bodyVisibleScore: 0,
      fullBodyOk: false,
      fullBodyReason: "Нет позы",
      fullBodyScore: 0,
    };
  }

  const full = fullBodyProgress(landmarks);

  const key = [
    LM.L_SHOULDER,
    LM.R_SHOULDER,
    LM.L_HIP,
    LM.R_HIP,
    LM.L_KNEE,
    LM.R_KNEE,
    LM.L_ANKLE,
    LM.R_ANKLE,
    LM.L_WRIST,
    LM.R_WRIST,
  ];
  const bodyVisibleScore =
    key.reduce((sum, i) => sum + vis(landmarks[i]), 0) / key.length;

  const shoulders =
    (vis(landmarks[LM.L_SHOULDER]) + vis(landmarks[LM.R_SHOULDER])) / 2;
  const hips =
    (vis(landmarks[LM.L_HIP]) + vis(landmarks[LM.R_HIP])) / 2;
  const wrists =
    (vis(landmarks[LM.L_WRIST]) + vis(landmarks[LM.R_WRIST])) / 2;
  const ankles =
    (vis(landmarks[LM.L_ANKLE]) + vis(landmarks[LM.R_ANKLE])) / 2;

  const shoulderW = dist(landmarks[LM.L_SHOULDER], landmarks[LM.R_SHOULDER]);
  const hipW = dist(landmarks[LM.L_HIP], landmarks[LM.R_HIP]);
  const torsoH = dist(
    {
      x: (landmarks[LM.L_SHOULDER].x + landmarks[LM.R_SHOULDER].x) / 2,
      y: (landmarks[LM.L_SHOULDER].y + landmarks[LM.R_SHOULDER].y) / 2,
      z: 0,
    },
    {
      x: (landmarks[LM.L_HIP].x + landmarks[LM.R_HIP].x) / 2,
      y: (landmarks[LM.L_HIP].y + landmarks[LM.R_HIP].y) / 2,
      z: 0,
    }
  );

  let clothingLikely = false;
  const reasons: string[] = [];

  if (shoulders > 0.55 && wrists < 0.45) {
    clothingLikely = true;
    reasons.push("руки закрыты");
  }
  if (hips > 0.55 && ankles < 0.45) {
    clothingLikely = true;
    reasons.push("ноги закрыты");
  }
  if (shoulderW > 0 && hipW / shoulderW > 1.35) {
    clothingLikely = true;
    reasons.push("широкий силуэт (вероятна верхняя одежда)");
  }
  if (torsoH > 0 && shoulderW / torsoH > 0.72) {
    clothingLikely = true;
    reasons.push("объёмный торс");
  }

  const clothingReason = clothingLikely
    ? `Обнаружена одежда: ${reasons.join(", ")}. Для точности — облегающая форма.`
    : "Силуэт подходит для сканирования";

  return {
    poseVisible: bodyVisibleScore >= 0.55 && full.ok,
    clothingLikely,
    clothingReason,
    bodyVisibleScore: Math.round(bodyVisibleScore * 100) / 100,
    fullBodyOk: full.ok,
    fullBodyReason: full.reason,
    fullBodyScore: full.score,
  };
}

export function waitForVisiblePose(
  getLandmarks: () => NormalizedLandmark[] | null,
  maxMs = 20000
): Promise<ScanAnalysis> {
  return new Promise((resolve) => {
    const start = Date.now();
    let hold = 0;
    const id = setInterval(() => {
      const analysis = analyzeScanFrame(getLandmarks());
      if (analysis.fullBodyOk && analysis.poseVisible) {
        hold += 1;
        if (hold >= 12) {
          clearInterval(id);
          resolve(analysis);
          return;
        }
      } else {
        hold = 0;
      }
      if (Date.now() - start > maxMs) {
        clearInterval(id);
        resolve(analyzeScanFrame(getLandmarks()));
      }
    }, 120);
  });
}
