import type { CalibrationStep, Sport, StrengthExercise } from "@/types";
import type { NormalizedLandmark } from "@/types";
import { LM, dist } from "@/lib/pose/landmarks";
import { analyzePoseLive } from "@/lib/calibration/poseAnalysis";
import {
  deviceCameraProfile,
  type DeviceCameraProfile,
  type DeviceKind,
} from "@/lib/camera/deviceProfile";
import {
  distanceCoachHint,
  estimateDistanceMeters,
  distanceStepMeters,
  formatDistance,
  type DistanceEstimate,
} from "@/lib/camera/distanceEstimator";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";
import { analyzeCameraSetup } from "@/lib/camera/cameraSetupCoach";

export type PositionIssue =
  | "no_body"
  | "too_far"
  | "too_close"
  | "head_cut"
  | "feet_cut"
  | "side_profile"
  | "arms_hidden"
  | "pose_mismatch"
  | "ready";

export type CoachContext =
  | { mode: "calibration"; step: CalibrationStep; sport?: Sport }
  | { mode: "sport_setup"; sport: Sport; exercise?: StrengthExercise | null }
  | { mode: "training"; sport: Sport; exercise?: StrengthExercise | null };

export interface PositionCoachResult {
  issue: PositionIssue;
  ready: boolean;
  progress: number;
  hint: string;
  detail: string;
  metrics: string;
  distance?: DistanceEstimate | null;
}

function vis(lm: NormalizedLandmark): number {
  return lm.visibility ?? 0;
}

function bodyMetrics(landmarks: NormalizedLandmark[]) {
  const nose = landmarks[LM.NOSE];
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];

  const ys = [nose.y, ls.y, rs.y];
  const top = Math.min(...ys);
  const bottom = Math.max(la.y, ra.y, ls.y, rs.y);
  const bodyHeight = bottom - top;
  const shoulderW = dist(ls, rs);
  const depth = ls.z - rs.z;
  const headOk = vis(nose) > 0.35;
  const feetOk = vis(la) > 0.28 || vis(ra) > 0.28;
  const armsOk =
    (vis(lw) > 0.3 && vis(rw) > 0.3) ||
    vis(lw) > 0.45 ||
    vis(rw) > 0.45;

  return {
    bodyHeight,
    shoulderW,
    depth,
    headOk,
    feetOk,
    armsOk,
    top,
    bottom,
  };
}

function distanceIssue(
  m: ReturnType<typeof bodyMetrics>,
  profile: DeviceCameraProfile,
  options?: { requireFeet?: boolean }
): PositionIssue | null {
  const requireFeet = options?.requireFeet !== false;
  if (!m.headOk || m.top < 0.03) return "head_cut";
  if (requireFeet && (!m.feetOk || m.bottom > 0.97)) return "feet_cut";
  if (m.shoulderW > profile.shoulderMax + 0.04 || m.bodyHeight > profile.bodyHeightMax) {
    return "too_close";
  }
  if (m.shoulderW < profile.shoulderMin * 0.85 || m.bodyHeight < profile.bodyHeightMin * 0.75) {
    return "too_far";
  }
  return null;
}

function sportStanceHint(
  sport: Sport,
  exercise: StrengthExercise | null | undefined,
  m: ReturnType<typeof bodyMetrics>
): { issue: PositionIssue | null; hint: string } {
  if (sport === "boxing" || sport === "tennis") {
    if (m.shoulderW < 0.11 && Math.abs(m.depth) > 0.02) {
      return {
        issue: "side_profile",
        hint:
          sport === "boxing"
            ? "Развернитесь грудью к камере — для бокса нужен фронт, не профиль"
            : "Повернитесь к камере — замах должен быть виден спереди",
      };
    }
    if (!m.armsOk) {
      return {
        issue: "arms_hidden",
        hint: "Опустите руки в кадр — камера должна видеть кисти и локти",
      };
    }
    if (sport === "boxing") {
      return {
        issue: null,
        hint: "Стойка: лицом к камере, 60–80 см от экрана. Голова, корпус и руки в кадре",
      };
    }
    return {
      issue: null,
      hint: "Лицом к камере, 60–80 см от экрана. Голова, корпус и рука с замахом в кадре",
    };
  }

  if (sport === "strength") {
    if (exercise === "bench") {
      return {
        issue: null,
        hint: "Жим: 55–80 см от экрана, лопатки и локти в кадре",
      };
    }
    if (exercise === "lunge") {
      return {
        issue: null,
        hint: "Выпад: лицом к камере, 55–80 см — передняя нога и колено в кадре",
      };
    }
    return {
      issue: null,
      hint: "Присед: лицом к камере, 55–80 см — колени, бёдра и спина в кадре",
    };
  }

  return { issue: null, hint: "" };
}

function issueHint(
  issue: PositionIssue,
  profile: DeviceCameraProfile,
  sport?: Sport
): string {
  switch (issue) {
    case "no_body":
      return "Встаньте в кадр — камера вас не видит";
    case "too_far":
      return `Подойдите ближе (${profile.distanceHint})`;
    case "too_close":
      return "Отойдите на шаг назад — вы слишком близко";
    case "head_cut":
      return "Голова обрезана — отойдите или опустите камеру";
    case "feet_cut":
      return "Ступни не видны — отойдите, встаньте в полный рост";
    case "side_profile":
      return sport === "tennis"
        ? "Повернитесь к камере — не стойте чистым боком"
        : "Встаньте лицом к камере, не боком как в ринге";
    case "arms_hidden":
      return "Руки вне кадра — отойдите или разведите руки";
    case "pose_mismatch":
      return "Исправьте позу по подсказке ниже";
    case "ready":
      return "✓ Позиция верная — можно начинать";
    default:
      return profile.distanceHint;
  }
}

export function analyzePosition(
  landmarks: NormalizedLandmark[] | null,
  context: CoachContext,
  deviceKind?: DeviceKind,
  heightCm?: number,
  calibration?: CameraCalibration | null
): PositionCoachResult {
  const profile = deviceCameraProfile(deviceKind);

  if (!landmarks || landmarks.length < 29) {
    return {
      issue: "no_body",
      ready: false,
      progress: 0,
      hint: "Встаньте в кадр — нужны голова, плечи и руки",
      detail: profile.distanceHint,
      metrics: "pose: ожидание…",
    };
  }

  const m = bodyMetrics(landmarks);
  const cam = analyzeCameraSetup(landmarks);

  if (!m.headOk && m.shoulderW > 0.06) {
    return {
      issue: "head_cut",
      ready: false,
      progress: cam.progress,
      hint: cam.hint,
      detail: cam.detail,
      metrics: `плечи ${m.shoulderW.toFixed(2)} · настройка камеры`,
    };
  }

  if (context.mode === "sport_setup" && cam.issue === "backlight") {
    return {
      issue: "no_body",
      ready: false,
      progress: cam.progress,
      hint: cam.hint,
      detail: cam.detail,
      metrics: "свет / камера",
    };
  }

  if (context.mode === "calibration") {
    const live = analyzePoseLive(context.step, landmarks);
    const m = bodyMetrics(landmarks);
    const dist = distanceIssue(m, profile);
    const sportTip =
      context.sport === "boxing"
        ? "После скана: для бокса тренируйтесь лицом к камере"
        : context.sport === "tennis"
          ? "После скана: для тенниса — замах виден спереди"
          : context.sport === "strength"
            ? "После скана: силовые — колени и спина в кадре"
            : "";
    if (dist && dist !== "feet_cut" && context.step === "upper_body") {
      return {
        issue: dist,
        ready: false,
        progress: live.progress * 0.5,
        hint: issueHint(dist, profile),
        detail: live.feedback,
        metrics: live.metrics,
      };
    }
    return {
      issue: live.accepted ? "ready" : "pose_mismatch",
      ready: live.accepted,
      progress: live.progress,
      hint: live.feedback || poseStepFallback(context.step),
      detail: sportTip || profile.distanceHint,
      metrics: live.metrics,
    };
  }

  const sport = context.sport;
  const exercise = context.exercise;
  const punchSport = sport === "boxing" || sport === "tennis";
  const distance = estimateDistanceMeters(
    landmarks,
    heightCm ?? 175,
    profile.kind,
    calibration,
    true
  );

  const dist = distanceIssue(m, profile, {
    requireFeet: !punchSport,
  });

  if (distance && distance.meters > distance.targetMax + 0.15) {
    return {
      issue: "too_far",
      ready: false,
      progress: 0.2,
      hint: distanceCoachHint(distance, sport),
      detail: `Цель: ${Math.round(distance.targetMin * 100)}–${Math.round(distance.targetMax * 100)} см`,
      metrics: `${formatDistance(distance.meters)} · плечи ${m.shoulderW.toFixed(2)}`,
      distance,
    };
  }

  const step = distance ? distanceStepMeters(distance) : null;
  if (step !== null && distance) {
    const progress = Math.min(
      0.75,
      0.35 + (1 - Math.min(1, Math.abs(step) / 0.8)) * 0.4
    );
    return {
      issue: step < 0 ? "too_far" : "too_close",
      ready: false,
      progress,
      hint: distanceCoachHint(distance, sport),
      detail:
        step < 0
          ? `Подойдите на ~${Math.max(5, Math.round(Math.abs(step) * 100))} см ближе · цель ${Math.round(distance.targetMin * 100)}–${Math.round(distance.targetMax * 100)} см`
          : `Отойдите на ~${Math.max(5, Math.round(step * 100))} см · цель ${Math.round(distance.targetMin * 100)}–${Math.round(distance.targetMax * 100)} см`,
      metrics: `${formatDistance(distance.meters)} · плечи ${m.shoulderW.toFixed(2)}`,
      distance,
    };
  }

  if (dist === "feet_cut" && punchSport) {
    // для ударов достаточно пояс-голова
  } else if (dist) {
    const progress =
      dist === "too_far"
        ? Math.min(0.7, m.shoulderW / profile.shoulderMin)
        : dist === "too_close"
          ? Math.min(0.7, profile.shoulderMax / Math.max(m.shoulderW, 0.01))
          : 0.25;
    const hint =
      distance && (dist === "too_far" || dist === "too_close")
        ? distanceCoachHint(distance, sport)
        : issueHint(dist, profile, sport);
    return {
      issue: dist,
      ready: false,
      progress,
      hint,
      detail: distance
        ? `Цель ${Math.round(distance.targetMin * 100)}–${Math.round(distance.targetMax * 100)} см`
        : profile.distanceHint,
      metrics: `плечи ${m.shoulderW.toFixed(2)} · ${m.headOk ? "голова ✓" : "голова ✗"} · ${m.armsOk ? "руки ✓" : "руки ✗"}`,
      distance,
    };
  }

  const stance = sportStanceHint(sport, exercise, m);
  if (stance.issue) {
    return {
      issue: stance.issue,
      ready: false,
      progress: 0.55,
      hint: stance.hint,
      detail: profile.distanceHint,
      metrics: `плечи ${m.shoulderW.toFixed(2)} · depth ${m.depth.toFixed(3)}`,
    };
  }

  return {
    issue: "ready",
    ready: true,
    progress: 1,
    hint:
      distance && punchSport
        ? distanceCoachHint(distance, sport)
        : stance.hint || issueHint("ready", profile, sport),
    detail: distance
      ? `Дальномер: ${formatDistance(distance.meters)}`
      : profile.label,
    metrics: distance
      ? `${formatDistance(distance.meters)} · плечи ${m.shoulderW.toFixed(2)}`
      : `плечи ${m.shoulderW.toFixed(2)} · ${m.armsOk ? "руки ✓" : "руки ?"}`,
    distance,
  };
}

function poseStepFallback(step: CalibrationStep): string {
  const map: Partial<Record<CalibrationStep, string>> = {
    upper_body: "Ближе к камере — голова, плечи и торс",
    arms_up: "Поднимите обе руки выше плеч",
    turn_left: "Повернитесь левым боком к камере",
    turn_right: "Повернитесь правым боком к камере",
    center: "Снова лицом к камере",
    rotate_360: "Медленно повернитесь на 360°",
  };
  return map[step] ?? "Следуйте инструкции на экране";
}
