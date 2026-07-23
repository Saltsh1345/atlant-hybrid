import type { NormalizedLandmark } from "@/types";
import type { WorkoutMetrics } from "@/lib/workout/types";

const WRIST_LEFT = 15;
const WRIST_RIGHT = 16;
const MIN_VELOCITY_FOR_REP = 0.12;

export interface VerticalVbtTracker {
  update: (landmarks: NormalizedLandmark[] | null, nowMs: number) => WorkoutMetrics;
  reset: () => void;
}

const EMPTY: WorkoutMetrics = {
  verticalVelocityMs: 0,
  peakVelocityMs: 0,
  baselineVelocityMs: null,
  fatiguePercent: 0,
  repetitions: 0,
  failed: false,
};

/**
 * Camera-derived VBT: vertical wrist velocity in normalized screen heights/s.
 * The first completed upward repetition establishes the baseline; a loss of
 * at least 20% is an in-session failure signal, not a medical conclusion.
 */
export function createVerticalVbtTracker(): VerticalVbtTracker {
  let previous: { y: number; at: number } | null = null;
  let repPeak = 0;
  let wasMovingUp = false;
  let baseline: number | null = null;
  let peak = 0;
  let reps = 0;
  let failed = false;

  const reset = () => {
    previous = null;
    repPeak = 0;
    wasMovingUp = false;
    baseline = null;
    peak = 0;
    reps = 0;
    failed = false;
  };

  const update = (
    landmarks: NormalizedLandmark[] | null,
    nowMs: number,
  ): WorkoutMetrics => {
    const left = landmarks?.[WRIST_LEFT];
    const right = landmarks?.[WRIST_RIGHT];
    const wrist =
      (left?.visibility ?? 0) >= (right?.visibility ?? 0) ? left : right;
    if (!wrist || (wrist.visibility ?? 0) < 0.45) {
      return {
        ...EMPTY,
        peakVelocityMs: peak,
        baselineVelocityMs: baseline,
        repetitions: reps,
        failed,
      };
    }

    let upwardVelocity = 0;
    if (previous) {
      const dtSec = (nowMs - previous.at) / 1000;
      if (dtSec > 0.015 && dtSec < 0.25) {
        // y grows downward in normalized screen coordinates.
        upwardVelocity = Math.max(0, (previous.y - wrist.y) / dtSec);
      }
    }
    previous = { y: wrist.y, at: nowMs };

    if (upwardVelocity >= MIN_VELOCITY_FOR_REP) {
      wasMovingUp = true;
      repPeak = Math.max(repPeak, upwardVelocity);
      peak = Math.max(peak, upwardVelocity);
    } else if (wasMovingUp) {
      wasMovingUp = false;
      if (repPeak >= MIN_VELOCITY_FOR_REP) {
        reps += 1;
        if (baseline === null) baseline = repPeak;
        if (baseline && repPeak <= baseline * 0.8) failed = true;
      }
      repPeak = 0;
    }

    const fatiguePercent =
      baseline && repPeak > 0
        ? Math.max(0, Math.min(100, Math.round((1 - repPeak / baseline) * 100)))
        : 0;

    return {
      verticalVelocityMs: upwardVelocity,
      peakVelocityMs: peak,
      baselineVelocityMs: baseline,
      fatiguePercent,
      repetitions: reps,
      failed,
    };
  };

  return { update, reset };
}
