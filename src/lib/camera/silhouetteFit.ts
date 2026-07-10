import type { NormalizedLandmark } from "@/types";
import type { Sport } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";
import {
  estimateDistanceMeters,
  formatDistance,
} from "@/lib/camera/distanceEstimator";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";
import {
  detectDeviceKind,
  type DeviceKind,
} from "@/lib/camera/deviceProfile";
import { detectMobileCameraCapabilities } from "@/lib/camera/mobileCamera";

export interface SilhouetteFitResult {
  fit: boolean;
  progress: number;
  hint: string;
  detail: string;
  headOk: boolean;
  shouldersOk: boolean;
  armsOk: boolean;
  distanceOk: boolean;
  distanceM: number | null;
}

/** Профиль силуэта под устройство. */
function templateForDevice(kind: DeviceKind, _sport: Sport) {
  if (kind === "phone" || kind === "tablet") {
    return {
      headYMin: 0.04,
      headYMax: 0.22,
      headXCenter: 0.5,
      headXTolerance: 0.12,
      shoulderWMin: 0.08,
      shoulderWMax: 0.22,
      shoulderYMin: 0.12,
      shoulderYMax: 0.32,
      armsRequired: false,
      feetYMin: 0.78,
      fullBody: true,
    };
  }
  return {
    headYMin: 0.05,
    headYMax: 0.34,
    headXCenter: 0.5,
    headXTolerance: 0.14,
    shoulderWMin: 0.17,
    shoulderWMax: 0.44,
    shoulderYMin: 0.16,
    shoulderYMax: 0.45,
    armsRequired: true,
    feetYMin: 0,
    fullBody: false,
  };
}

/** @deprecated use templateForDevice */
function templateForSport(_sport: Sport) {
  return templateForDevice("laptop", _sport);
}

export function analyzeSilhouetteFit(
  landmarks: NormalizedLandmark[] | null,
  sport: Sport,
  heightCm: number,
  calibration?: CameraCalibration | null,
  deviceKind?: DeviceKind
): SilhouetteFitResult {
  const kind = deviceKind ?? detectDeviceKind();
  const mobile = detectMobileCameraCapabilities();
  const isPhone = kind === "phone" || kind === "tablet";

  const empty: SilhouetteFitResult = {
    fit: false,
    progress: 0,
    hint: isPhone
      ? "Поставьте телефон · задняя камера · полный рост в кадре"
      : "Встаньте перед камерой — вписывайтесь в силуэт",
    detail: isPhone
      ? "1.5–2.5 м · голова и ступни видны"
      : "Лицом к экрану, 60–70 см",
    headOk: false,
    shouldersOk: false,
    armsOk: false,
    distanceOk: false,
    distanceM: null,
  };

  if (!landmarks?.length) return empty;

  const t = templateForDevice(kind, sport);
  const nose = landmarks[LM.NOSE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];

  const headVis = nose.visibility ?? 0;
  const shoulderW = dist(ls, rs);
  const shoulderY = (ls.y + rs.y) / 2;
  const shoulderVis = ((ls.visibility ?? 0) + (rs.visibility ?? 0)) / 2;
  const armVis = Math.max(lw.visibility ?? 0, rw.visibility ?? 0);
  const ankleY = Math.max(la.y, ra.y);
  const feetVis = Math.max(la.visibility ?? 0, ra.visibility ?? 0);

  const headOk =
    headVis > 0.35 &&
    nose.y >= t.headYMin &&
    nose.y <= t.headYMax &&
    Math.abs(nose.x - t.headXCenter) < t.headXTolerance;

  const shouldersOk =
    shoulderVis > 0.35 &&
    shoulderW >= t.shoulderWMin &&
    shoulderW <= t.shoulderWMax &&
    shoulderY >= t.shoulderYMin &&
    shoulderY <= t.shoulderYMax;

  const armsOk = !t.armsRequired || armVis > 0.3;

  const feetOk =
    !t.fullBody ||
    (feetVis > 0.35 && ankleY >= (t.feetYMin ?? 0.75));

  const distEst = estimateDistanceMeters(
    landmarks,
    heightCm,
    kind,
    calibration,
    true
  );
  const distanceM = distEst?.meters ?? null;
  const targetMin = isPhone ? mobile.scanDistanceMinM : (distEst?.targetMin ?? 0.55);
  const targetMax = isPhone ? mobile.scanDistanceMaxM : (distEst?.targetMax ?? 0.8);
  const distanceOk =
    distanceM != null &&
    distanceM >= targetMin - 0.15 &&
    distanceM <= targetMax + 0.2;

  let progress = 0;
  if (headOk) progress += isPhone ? 0.22 : 0.28;
  else if (headVis > 0.25) progress += 0.1;
  if (shouldersOk) progress += isPhone ? 0.22 : 0.32;
  else if (shoulderVis > 0.3) progress += 0.12;
  if (armsOk) progress += 0.15;
  if (feetOk) progress += isPhone ? 0.26 : 0;
  if (distanceOk) progress += 0.2;
  else if (distanceM != null) progress += 0.05;

  progress = Math.min(1, progress);

  let hint = empty.hint;
  if (!headOk) {
    if (isPhone) {
      hint =
        nose.y > t.headYMax
          ? "Отойдите дальше — голова слишком крупно"
          : "Выровняйте голову по центру кадра";
    } else if (nose.y < t.headYMin) {
      hint = "Голова срезана — откиньте крышку ноутбука или сядьте ниже";
    } else if (nose.y > t.headYMax) {
      hint = "Опуститесь в силуэт — голова слишком низко";
    } else {
      hint = "Выровняйте голову по центру силуэта";
    }
  } else if (!feetOk && t.fullBody) {
    hint = "Ступни не в кадре — отойдите на 2 м, телефон на уровне груди";
  } else if (!shouldersOk) {
    if (shoulderW < t.shoulderWMin) {
      hint = isPhone
        ? "Подойдите ближе к телефону"
        : "Подойдите ближе к экрану — вы слишком мелко в силуэте";
    } else if (shoulderW > t.shoulderWMax) {
      hint = isPhone
        ? "Отойдите — вы слишком крупно в кадре"
        : "Отойдите чуть назад — вы слишком крупно в силуэте";
    } else {
      hint = "Плечи в линию с силуэтом";
    }
  } else if (!armsOk) {
    hint = "Опустите руки в кадр — должны быть видны кисти";
  } else if (!distanceOk && distanceM != null) {
    hint =
      distanceM < targetMin
        ? `Слишком близко (${formatDistance(distanceM)})`
        : `Далековато (${formatDistance(distanceM)})`;
  } else if (progress >= 0.85) {
    hint = "✓ В силуэте — держите позу, скан запустится сам";
  } else {
    hint = "Подстройтесь по силуэту на экране";
  }

  const detail =
    distanceM != null
      ? `${formatDistance(distanceM)} · плечи ${shoulderW.toFixed(2)} · ${
          isPhone ? "цель 1.5–2.5 м" : "цель 55–80 см"
        }`
      : `плечи ${shoulderW.toFixed(2)}`;

  const fitBase =
    progress >= 0.82 && headOk && shouldersOk && armsOk && distanceOk;
  const fit = t.fullBody ? fitBase && feetOk : fitBase;

  return {
    fit,
    progress,
    hint,
    detail,
    headOk,
    shouldersOk,
    armsOk: armsOk && feetOk,
    distanceOk,
    distanceM,
  };
}
