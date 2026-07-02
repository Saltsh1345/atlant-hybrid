import type { CalibrationStep } from "@/types";
import type { NormalizedLandmark } from "@/types";
import { analyzePoseLive } from "@/lib/calibration/poseAnalysis";

const HOLD_FRAMES = 12;

export function poseGuideProgress(
  step: CalibrationStep,
  landmarks: NormalizedLandmark[]
): number {
  return analyzePoseLive(step, landmarks).progress;
}

export function checkPoseGuide(
  step: CalibrationStep,
  landmarks: NormalizedLandmark[]
): boolean {
  return analyzePoseLive(step, landmarks).accepted;
}

export { isPoseGuideStep, poseGuideHint } from "@/lib/calibration/poseAnalysis";

/** Waits until camera confirms pose — no timeout, no auto-skip. */
export function waitForLivePose(
  step: CalibrationStep,
  getLandmarks: () => NormalizedLandmark[] | null,
  onTick?: (progress: number, feedback: string, metrics: string) => void,
  onNudge?: (feedback: string) => void
): Promise<void> {
  return new Promise((resolve) => {
    let hold = 0;
    let lastNudge = Date.now();

    const tick = () => {
      const lm = getLandmarks();
      const analysis = analyzePoseLive(step, lm);
      onTick?.(analysis.progress, analysis.feedback, analysis.metrics);

      if (analysis.accepted) {
        hold += 1;
        if (hold >= HOLD_FRAMES) {
          resolve();
          return;
        }
      } else {
        hold = 0;
        if (Date.now() - lastNudge > 7000) {
          lastNudge = Date.now();
          onNudge?.(analysis.feedback);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
