import type { CalibrationStep } from "@/types";
import type { NormalizedLandmark } from "@/types";
import { analyzePoseLive } from "@/lib/calibration/poseAnalysis";

const HOLD_FRAMES = 8;

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

/** Skip current pose wait (manual bypass). */
let skipPoseWait = false;

export function requestPoseSkip(): void {
  skipPoseWait = true;
}

export function resetPoseSkip(): void {
  skipPoseWait = false;
}

export { isPoseGuideStep, poseGuideHint } from "@/lib/calibration/poseAnalysis";

export function waitForLivePose(
  step: CalibrationStep,
  getLandmarks: () => NormalizedLandmark[] | null,
  onTick?: (progress: number, feedback: string, metrics: string) => void,
  onNudge?: (feedback: string) => void
): Promise<void> {
  skipPoseWait = false;
  return new Promise((resolve) => {
    let hold = 0;
    let lastNudge = Date.now();

    const tick = () => {
      if (skipPoseWait) {
        skipPoseWait = false;
        resolve();
        return;
      }
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
        if (Date.now() - lastNudge > 12000) {
          lastNudge = Date.now();
          onNudge?.(analysis.feedback);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
