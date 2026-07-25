import type {
  WorkoutGesture,
  WorkoutGestureEvent,
} from "@/lib/workout/types";

export interface GestureStateMachine {
  update: (
    gesture: WorkoutGesture | null,
    nowMs: number,
  ) => WorkoutGestureEvent | null;
  reset: () => void;
}

/**
 * A stable open palm pauses a session. Keeping it shown for 1.8 s ends it;
 * the long hold prevents an accidental stop while preserving touchless use.
 */
export function createGestureStateMachine(
  holdFrames = 6,
  cooldownMs = 1200,
): GestureStateMachine {
  let candidate: WorkoutGesture | null = null;
  let frames = 0;
  let candidateStartedAt = 0;
  let pauseTriggered = false;
  let holdTriggered = false;
  let lastTriggeredAt = -Infinity;

  return {
    update(gesture, nowMs) {
      if (!gesture) {
        candidate = null;
        frames = 0;
        pauseTriggered = false;
        holdTriggered = false;
        return null;
      }
      if (gesture !== candidate) {
        candidate = gesture;
        frames = 1;
        candidateStartedAt = nowMs;
        pauseTriggered = false;
        holdTriggered = false;
        return null;
      }
      frames += 1;
      if (
        gesture === "open_palm" &&
        pauseTriggered &&
        !holdTriggered &&
        nowMs - candidateStartedAt >= 1800
      ) {
        holdTriggered = true;
        lastTriggeredAt = nowMs;
        return "open_palm_hold";
      }
      if (frames < holdFrames || nowMs - lastTriggeredAt < cooldownMs) {
        return null;
      }
      lastTriggeredAt = nowMs;
      if (gesture === "open_palm") {
        pauseTriggered = true;
      } else {
        candidate = null;
        frames = 0;
      }
      return gesture;
    },
    reset() {
      candidate = null;
      frames = 0;
      candidateStartedAt = 0;
      pauseTriggered = false;
      holdTriggered = false;
      lastTriggeredAt = -Infinity;
    },
  };
}
