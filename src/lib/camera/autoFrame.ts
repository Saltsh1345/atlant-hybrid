import type { NormalizedLandmark } from "@/types";
import type { Sport } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";

export type FrameDistance =
  | "searching"
  | "too_close"
  | "too_far"
  | "partial_top"
  | "partial_bottom"
  | "ok";

export interface AutoFrameTarget {
  distance: FrameDistance;
  hint: string;
  scale: number;
  originX: number;
  originY: number;
  bodyHeight: number;
  shoulderW: number;
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function idealBodyHeight(sport?: Sport): number {
  if (sport === "boxing") return 0.68;
  if (sport === "tennis") return 0.7;
  return 0.74;
}

export function computeAutoFrame(
  landmarks: NormalizedLandmark[] | null,
  sport?: Sport
): AutoFrameTarget {
  const idle: AutoFrameTarget = {
    distance: "searching",
    hint: "Встаньте в кадр — камера подстроит ракурс",
    scale: 1,
    originX: 0.5,
    originY: 0.5,
    bodyHeight: 0,
    shoulderW: 0,
  };

  if (!landmarks || landmarks.length < 29) return idle;

  const pts = [
    landmarks[LM.NOSE],
    landmarks[LM.L_SHOULDER],
    landmarks[LM.R_SHOULDER],
    landmarks[LM.L_HIP],
    landmarks[LM.R_HIP],
    landmarks[LM.L_ANKLE],
    landmarks[LM.R_ANKLE],
    landmarks[LM.L_WRIST],
    landmarks[LM.R_WRIST],
  ].filter((p) => vis(p) > 0.25);

  if (pts.length < 4) return idle;

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const top = Math.min(landmarks[LM.NOSE].y, ...ys);
  const bottom = Math.max(
    landmarks[LM.L_ANKLE].y,
    landmarks[LM.R_ANKLE].y,
    ...ys
  );
  const bodyHeight = clamp(bottom - top, 0.15, 0.98);
  const originX = clamp((Math.min(...xs) + Math.max(...xs)) / 2, 0.12, 0.88);
  const originY = clamp((top + bottom) / 2, 0.12, 0.88);
  const shoulderW = dist(
    landmarks[LM.L_SHOULDER],
    landmarks[LM.R_SHOULDER]
  );

  const headOk = vis(landmarks[LM.NOSE]) > 0.35;
  const feetOk =
    vis(landmarks[LM.L_ANKLE]) > 0.28 || vis(landmarks[LM.R_ANKLE]) > 0.28;
  const ideal = idealBodyHeight(sport);
  const scale = clamp(ideal / bodyHeight, 0.82, 2.15);

  let distance: FrameDistance = "ok";
  let hint = "✓ Кадр оптимален — AutoFrame";

  if (!headOk || top < 0.04) {
    distance = "partial_top";
    hint = "Голова обрезана — отойдите назад";
  } else if (!feetOk || bottom > 0.96) {
    distance = "partial_bottom";
    hint = "Ступни не видны — отойдите на шаг назад";
  } else if (shoulderW > 0.34 || bodyHeight > 0.9) {
    distance = "too_close";
    hint = "Слишком близко — отойдите на 1–2 метра";
  } else if (shoulderW < 0.08 || bodyHeight < 0.42) {
    distance = "too_far";
    hint = "Слишком далеко — подойдите ближе к камере";
  } else if (Math.abs(scale - 1) < 0.06) {
    hint = "✓ Расстояние и кадр в норме";
  } else if (scale > 1.08) {
    hint = "Камера приближает кадр";
  } else {
    hint = "Камера отдаляет кадр";
  }

  return {
    distance,
    hint,
    scale,
    originX,
    originY,
    bodyHeight,
    shoulderW,
  };
}

export function lerpFrame(
  current: AutoFrameTarget,
  next: AutoFrameTarget,
  t: number
): AutoFrameTarget {
  const k = clamp(t, 0, 1);
  return {
    ...next,
    scale: current.scale + (next.scale - current.scale) * k,
    originX: current.originX + (next.originX - current.originX) * k,
    originY: current.originY + (next.originY - current.originY) * k,
  };
}

export function shouldNudgeDistance(distance: FrameDistance): boolean {
  return distance !== "ok" && distance !== "searching";
}

export function nudgeMessage(distance: FrameDistance): string | null {
  switch (distance) {
    case "too_close":
      return "Отойдите от камеры — вы слишком близко.";
    case "too_far":
      return "Подойдите ближе — вас плохо видно.";
    case "partial_top":
      return "Голова не в кадре — отойдите назад, встаньте в полный рост.";
    case "partial_bottom":
      return "Отойдите назад — должны быть видны ступни.";
    default:
      return null;
  }
}
