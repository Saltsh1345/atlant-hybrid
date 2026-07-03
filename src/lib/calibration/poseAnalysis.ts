import type { CalibrationStep } from "@/types";
import type { NormalizedLandmark } from "@/types";
import { LM, angle, dist } from "@/lib/pose/landmarks";
import { fullBodyProgress } from "@/lib/calibration/scanAnalysis";

export interface PoseLiveAnalysis {
  progress: number;
  accepted: boolean;
  feedback: string;
  metrics: string;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function shoulderWidth(landmarks: NormalizedLandmark[]): number {
  return dist(landmarks[LM.L_SHOULDER], landmarks[LM.R_SHOULDER]);
}

/** Depth proxy: left shoulder further than right. */
function shoulderDepthDiff(landmarks: NormalizedLandmark[]): number {
  return landmarks[LM.L_SHOULDER].z - landmarks[LM.R_SHOULDER].z;
}

/** Front-facing: shoulder line parallel to camera (2D hip vs shoulder mid). */
function torsoYawX(landmarks: NormalizedLandmark[]): number {
  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  return (lh.x + rh.x) / 2 - (ls.x + rs.x) / 2;
}

function sideKneeAngle(landmarks: NormalizedLandmark[]): number {
  const leftScore =
    (landmarks[LM.L_HIP].visibility ?? 0) +
    (landmarks[LM.L_KNEE].visibility ?? 0) +
    (landmarks[LM.L_ANKLE].visibility ?? 0);
  const rightScore =
    (landmarks[LM.R_HIP].visibility ?? 0) +
    (landmarks[LM.R_KNEE].visibility ?? 0) +
    (landmarks[LM.R_ANKLE].visibility ?? 0);

  if (leftScore >= rightScore) {
    return angle(
      landmarks[LM.L_HIP],
      landmarks[LM.L_KNEE],
      landmarks[LM.L_ANKLE]
    );
  }
  return angle(
    landmarks[LM.R_HIP],
    landmarks[LM.R_KNEE],
    landmarks[LM.R_ANKLE]
  );
}

export function analyzePoseLive(
  step: CalibrationStep,
  landmarks: NormalizedLandmark[] | null
): PoseLiveAnalysis {
  if (!landmarks || landmarks.length < 29) {
    return {
      progress: 0,
      accepted: false,
      feedback: "Камера не видит тело — встаньте в кадр",
      metrics: "pose: none",
    };
  }

  const full = fullBodyProgress(landmarks);
  const w = shoulderWidth(landmarks);
  const depth = shoulderDepthDiff(landmarks);
  const knee = sideKneeAngle(landmarks);

  switch (step) {
    case "scan_start":
    case "body_analysis": {
      return {
        progress: full.score,
        accepted: full.ok,
        feedback: full.reason,
        metrics: `голова ${(landmarks[LM.NOSE].visibility ?? 0).toFixed(2)} · плечи ${w.toFixed(2)} · ступни ${Math.max(landmarks[LM.L_ANKLE].y, landmarks[LM.R_ANKLE].y).toFixed(2)}`,
      };
    }
    case "turn_left": {
      const depthScore = clamp01((depth - 0.01) / 0.06);
      const narrowScore = clamp01((0.26 - w) / 0.16);
      const progress = depthScore * 0.55 + narrowScore * 0.45;
      const accepted = progress >= 0.75 && depth > 0.012;
      return {
        progress,
        accepted,
        feedback: accepted
          ? "✓ Левый бок распознан"
          : depth < 0.01
            ? "Поверните корпус влево — левое плечо должно уйти от камеры"
            : "Ещё поверните влево, покажите левый бок",
        metrics: `depth ${depth.toFixed(3)} · плечи ${w.toFixed(2)}`,
      };
    }
    case "turn_right": {
      const depthScore = clamp01((-depth - 0.01) / 0.06);
      const narrowScore = clamp01((0.26 - w) / 0.16);
      const progress = depthScore * 0.55 + narrowScore * 0.45;
      const accepted = progress >= 0.75 && depth < -0.012;
      return {
        progress,
        accepted,
        feedback: accepted
          ? "✓ Правый бок распознан"
          : depth > -0.01
            ? "Поверните корпус вправо — правое плечо ближе к камере"
            : "Ещё поверните вправо, покажите правый бок",
        metrics: `depth ${depth.toFixed(3)} · плечи ${w.toFixed(2)}`,
      };
    }
    case "center": {
      const yawX = torsoYawX(landmarks);
      const yawScore = 1 - clamp01(Math.abs(yawX) / 0.055);
      const depthScore = 1 - clamp01(Math.abs(depth) / 0.08);
      const widthScore = clamp01((w - 0.11) / 0.14);
      const progress = yawScore * 0.45 + depthScore * 0.25 + widthScore * 0.3;
      const facing =
        Math.abs(yawX) < 0.055 &&
        w > 0.1 &&
        w < 0.36 &&
        Math.abs(depth) < 0.09;
      const accepted = facing && progress >= 0.65;
      let feedback = "Встаньте лицом к камере — плечи параллельно";
      if (accepted) feedback = "✓ Лицом к камере";
      else if (w < 0.12)
        feedback = "Развернитесь лицом — сейчас виден бок";
      else if (Math.abs(yawX) > 0.045)
        feedback = "Выровняйте плечи — не поворачивайте корпус";
      else if (Math.abs(depth) > 0.07)
        feedback = "Поверните грудь к камере";
      return {
        progress,
        accepted,
        feedback,
        metrics: `yaw ${yawX.toFixed(3)} · depth ${depth.toFixed(3)} · плечи ${w.toFixed(2)}`,
      };
    }
    case "profile_turn": {
      const profileScore = clamp01((0.26 - w) / 0.16);
      const fullOk = full.score;
      const progress = profileScore * 0.7 + fullOk * 0.3;
      const accepted = profileScore >= 0.85 && w < 0.15 && full.ok;
      return {
        progress,
        accepted,
        feedback: accepted
          ? "✓ Профиль принят"
          : w > 0.18
            ? "Повернитесь боком — плечи должны быть узкими в кадре"
            : "Отойдите, чтобы в профиль был виден полный рост",
        metrics: `плечи ${w.toFixed(2)} · рост ${full.score.toFixed(2)}`,
      };
    }
    case "squat": {
      const profileOk = w < 0.18 ? 1 : clamp01((0.24 - w) / 0.12);
      const squatScore = clamp01((150 - knee) / 50);
      const progress = profileOk * 0.25 + squatScore * 0.75;
      const accepted = knee < 125 && knee > 65 && progress >= 0.7;
      return {
        progress,
        accepted,
        feedback: accepted
          ? `✓ Присед принят · колено ${Math.round(knee)}°`
          : profileOk < 0.6
            ? "Оставайтесь боком к камере"
            : knee > 130
              ? `Присядьте глубже · сейчас ${Math.round(knee)}°`
              : `Держите присед · колено ${Math.round(knee)}°`,
        metrics: `колено ${Math.round(knee)}° · плечи ${w.toFixed(2)}`,
      };
    }
    default:
      return {
        progress: 1,
        accepted: true,
        feedback: "",
        metrics: "",
      };
  }
}

export function poseGuideHint(step: CalibrationStep): string {
  const hints: Partial<Record<CalibrationStep, string>> = {
    scan_start: "Отойдите — полный рост от головы до ступней",
    body_analysis: "Держите позу — камера сканирует силуэт",
    turn_left: "Поверните корпус влево — покажите левый бок",
    turn_right: "Поверните корпус вправо — покажите правый бок",
    center: "Встаньте лицом к камере",
    profile_turn: "Повернитесь боком — профиль, полный рост",
    squat: "Боком к камере — присядьте, колено ~90°",
  };
  return hints[step] ?? "Следуйте подсказке камеры";
}

export function isPoseGuideStep(step: CalibrationStep): boolean {
  return [
    "scan_start",
    "body_analysis",
    "turn_left",
    "turn_right",
    "center",
    "profile_turn",
    "squat",
  ].includes(step);
}
