import type { CalibrationStep } from "@/types";
import type { DeviceKind } from "@/lib/camera/deviceProfile";
import { isMobileDevice } from "@/lib/camera/mobileCamera";

export interface ScriptLine {
  step: CalibrationStep;
  text: string;
  durationMs: number;
  sample?: boolean;
  poseGuide?: boolean;
}

/** Ноутбук: ближний торс 60–70 см. */
export const LAPTOP_CALIBRATION_SCRIPT: ScriptLine[] = [
  {
    step: "upper_body",
    text: "Лицом к камере, 60–70 см. В кадре голова, плечи и торс.",
    durationMs: 3200,
    poseGuide: true,
    sample: true,
  },
  {
    step: "arms_up",
    text: "Поднимите руки выше плеч — виден торс и пропорции.",
    durationMs: 2800,
    poseGuide: true,
    sample: true,
  },
  {
    step: "turn_left",
    text: "Повернитесь левым боком — профиль для талии и спины.",
    durationMs: 3500,
    poseGuide: true,
    sample: true,
  },
  {
    step: "center",
    text: "Снова лицом к камере.",
    durationMs: 2500,
    poseGuide: true,
    sample: true,
  },
  {
    step: "turn_right",
    text: "Повернитесь правым боком к камере.",
    durationMs: 3500,
    poseGuide: true,
    sample: true,
  },
  {
    step: "rotate_360",
    text: "Медленно повернитесь на 360° — полный силуэт для анализа.",
    durationMs: 8000,
    sample: true,
  },
  {
    step: "analyzing",
    text: "Анализирую силуэт и состав тела…",
    durationMs: 800,
  },
  {
    step: "visualization",
    text: "Готово. Жир на двойнике — тёплые зоны на животе и бёдрах.",
    durationMs: 2000,
  },
];

/**
 * Смартфон: задняя камера, 1.5–2.5 м, полный рост — максимум для body scan.
 */
export const PHONE_CALIBRATION_SCRIPT: ScriptLine[] = [
  {
    step: "scan_start",
    text: "Поставьте телефон на уровень груди. Задняя камера. Отойдите на 2 метра — полный рост в кадре.",
    durationMs: 4500,
    poseGuide: true,
    sample: true,
  },
  {
    step: "center",
    text: "Лицом к камере, руки вдоль тела. Свет на тело, не в объектив.",
    durationMs: 3500,
    poseGuide: true,
    sample: true,
  },
  {
    step: "arms_up",
    text: "Руки вверх — торс и пропорции для анализа.",
    durationMs: 3000,
    poseGuide: true,
    sample: true,
  },
  {
    step: "turn_left",
    text: "Профиль влево — талия, спина, бёдра.",
    durationMs: 4000,
    poseGuide: true,
    sample: true,
  },
  {
    step: "turn_right",
    text: "Профиль вправо.",
    durationMs: 4000,
    poseGuide: true,
    sample: true,
  },
  {
    step: "rotate_360",
    text: "Медленный поворот на 360° — полный 3D-силуэт.",
    durationMs: 10000,
    sample: true,
  },
  {
    step: "analyzing",
    text: "Анализирую видеоскан с камеры телефона…",
    durationMs: 800,
  },
  {
    step: "visualization",
    text: "Готово. Смартфон дал полный рост — точность выше ноутбука.",
    durationMs: 2000,
  },
];

export function getCalibrationScript(kind?: DeviceKind): ScriptLine[] {
  if (kind === "phone" || kind === "tablet") {
    return PHONE_CALIBRATION_SCRIPT;
  }
  if (kind === "laptop") {
    return LAPTOP_CALIBRATION_SCRIPT;
  }
  return isMobileDevice() ? PHONE_CALIBRATION_SCRIPT : LAPTOP_CALIBRATION_SCRIPT;
}

/** @deprecated use getCalibrationScript */
export const CALIBRATION_SCRIPT = LAPTOP_CALIBRATION_SCRIPT;
