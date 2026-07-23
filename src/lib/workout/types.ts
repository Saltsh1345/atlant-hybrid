import type { NormalizedLandmark } from "@/types";

export type WorkoutPhase = "ready" | "running" | "paused" | "finished";
export type WorkoutGesture = "thumbs_up" | "open_palm";
export type WorkoutGestureEvent = WorkoutGesture | "open_palm_hold";

export interface WorkoutMetrics {
  verticalVelocityMs: number;
  peakVelocityMs: number;
  baselineVelocityMs: number | null;
  fatiguePercent: number;
  repetitions: number;
  failed: boolean;
}

export interface WorkoutAngles {
  leftElbow: number | null;
  rightElbow: number | null;
  leftKnee: number | null;
  rightKnee: number | null;
}

export interface WorkoutFrame {
  landmarks: NormalizedLandmark[] | null;
  angles: WorkoutAngles;
  metrics: WorkoutMetrics;
}
