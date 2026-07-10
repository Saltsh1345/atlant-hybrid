import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";

export type CameraSetupIssue =
  | "no_body"
  | "head_cut"
  | "tilt_lid"
  | "backlight"
  | "too_close"
  | "ready";

export interface CameraSetupResult {
  issue: CameraSetupIssue;
  ready: boolean;
  progress: number;
  hint: string;
  detail: string;
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

/** Laptop webcam framing — MateBook 14: lid ~110°, light from front. */
export function analyzeCameraSetup(
  landmarks: NormalizedLandmark[] | null
): CameraSetupResult {
  if (!landmarks?.length) {
    return {
      issue: "no_body",
      ready: false,
      progress: 0,
      hint: "Встаньте перед ноутбуком — камера должна вас видеть",
      detail: "Huawei MateBook 14: крышка ~110°, камера на верхней рамке",
    };
  }

  const nose = landmarks[LM.NOSE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const shoulderVis = (vis(ls) + vis(rs)) / 2;
  const shoulderY = (ls.y + rs.y) / 2;
  const shoulderW = Math.abs(rs.x - ls.x);
  const headVis = vis(nose);

  if (shoulderVis < 0.35 || shoulderW < 0.06) {
    return {
      issue: "no_body",
      ready: false,
      progress: 0.15,
      hint: "Подойдите ближе к экрану — плечи не видны",
      detail: "Сядьте прямо, лицом к камере",
    };
  }

  if (headVis < 0.35 && shoulderVis > 0.5) {
    return {
      issue: "backlight",
      ready: false,
      progress: 0.35,
      hint: "Сильный свет сзади — повернитесь лицом к окну или закройте штору",
      detail: "Иначе камера не видит лицо и замеры будут неверными",
    };
  }

  if (nose.y < 0.06 || headVis < 0.4) {
    if (shoulderY > 0.42) {
      return {
        issue: "tilt_lid",
        ready: false,
        progress: 0.45,
        hint: "Голова обрезана — откиньте крышку назад (110–120°) или сядьте чуть ниже",
        detail: "Камера MateBook в верхней рамке — наклоните экран, не поднимайте подбородок",
      };
    }
    return {
      issue: "head_cut",
      ready: false,
      progress: 0.4,
      hint: "Голова обрезана — откиньте крышку ноутбука назад",
      detail: "Голова должна быть в верхней трети кадра",
    };
  }

  if (shoulderW > 0.38 && nose.y < 0.12) {
    return {
      issue: "too_close",
      ready: false,
      progress: 0.5,
      hint: "Слишком близко к экрану — откиньте спинку стула на шаг",
      detail: "Для калибровки дотянитесь рукой до экрана, затем отойдите",
    };
  }

  const headInZone = nose.y >= 0.08 && nose.y <= 0.38 && headVis > 0.5;
  const progress = headInZone
    ? 0.7 + Math.min(0.3, shoulderVis * 0.3)
    : nose.y > 0.38
      ? 0.55
      : 0.6;

  if (!headInZone && nose.y > 0.38) {
    return {
      issue: "head_cut",
      ready: false,
      progress,
      hint: "Вы слишком низко в кадре — поднимитесь или наклоните экран чуть вниз",
      detail: "Голова — в верхней трети кадра",
    };
  }

  return {
    issue: "ready",
    ready: headInZone,
    progress: headInZone ? 1 : progress,
    hint: headInZone
      ? "✓ Камера настроена — переходим к калибровке дистанции"
      : "Выровняйте голову по центру верхней трети кадра",
    detail: "Свет на лицо, крышка откинута, плечи видны",
  };
}
