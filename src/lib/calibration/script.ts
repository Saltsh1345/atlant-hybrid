import type { CalibrationStep } from "@/types";

export interface ScriptLine {
  step: CalibrationStep;
  text: string;
  durationMs: number;
}

export const CALIBRATION_SCRIPT: ScriptLine[] = [
  {
    step: "scan_start",
    text: "Встаньте в полный рост лицом к камере. Отойдите, чтобы были видны голова и ступни.",
    durationMs: 4000,
  },
  {
    step: "body_analysis",
    text: "Сканирую силуэт. Не двигайтесь — полоса пройдёт по телу и подсветит зоны.",
    durationMs: 4500,
  },
  {
    step: "clothing_check",
    text: "Проверяю одежду — плечи, торс и бёдра должны быть видны.",
    durationMs: 3500,
  },
  {
    step: "turn_left",
    text: "Повернитесь налево — покажите левый бок и бицепс.",
    durationMs: 4000,
  },
  {
    step: "turn_right",
    text: "Повернитесь направо — правый бок, задержитесь.",
    durationMs: 4000,
  },
  {
    step: "center",
    text: "Вернитесь лицом к камере, полный рост.",
    durationMs: 3500,
  },
  {
    step: "profile_turn",
    text: "Повернитесь боком к камере — профиль, в полный рост.",
    durationMs: 4000,
  },
  {
    step: "squat",
    text: "Не поворачиваясь — медленно присядьте. Камера должна видеть угол колена и мышцы бедра.",
    durationMs: 5000,
  },
  {
    step: "biomech_ready",
    text: "Фиксирую состав тела и биомеханику. Data Latch активирован.",
    durationMs: 3500,
  },
  {
    step: "visualization",
    text: "Смотрите на двойника справа: жир — янтарный на торсе, мышцы — зелёные на конечностях.",
    durationMs: 5000,
  },
];
