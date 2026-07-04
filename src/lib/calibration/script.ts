import type { CalibrationStep } from "@/types";

export interface ScriptLine {
  step: CalibrationStep;
  text: string;
  durationMs: number;
  /** Collect pose samples during this step */
  sample?: boolean;
  /** Wait for pose guide before continuing */
  poseGuide?: boolean;
}

/**
 * Laptop webcam scan: upper body close → arms up → slow 360 → step back → squat.
 * Short, no long filming.
 */
export const CALIBRATION_SCRIPT: ScriptLine[] = [
  {
    step: "upper_body",
    text: "Подойдите ближе. В кадре — голова, плечи и торс. Руки вдоль тела.",
    durationMs: 2800,
    poseGuide: true,
    sample: true,
  },
  {
    step: "arms_up",
    text: "Поднимите руки вверх, чтобы кисти были в кадре. Не уходите назад.",
    durationMs: 2500,
    poseGuide: true,
    sample: true,
  },
  {
    step: "rotate_360",
    text: "Медленно повернитесь на месте на 360 градусов. Руки вверх, не торопитесь.",
    durationMs: 9000,
    sample: true,
  },
  {
    step: "step_back",
    text: "Отойдите на шаг назад, чтобы в кадре появились бёдра и колени.",
    durationMs: 3000,
    poseGuide: true,
    sample: true,
  },
  {
    step: "squat_lower",
    text: "Медленно присядьте и встаньте. Камера смотрит на колени и бёдра.",
    durationMs: 4000,
    poseGuide: true,
    sample: true,
  },
  {
    step: "analyzing",
    text: "Отправляю скан в Gemini. Строю двойника по анализу тела.",
    durationMs: 1200,
  },
  {
    step: "visualization",
    text: "Готово. Жир на двойнике — там, где указал анализ, без лишних зон на руках.",
    durationMs: 2500,
  },
];
