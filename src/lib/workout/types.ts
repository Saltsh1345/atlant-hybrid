import type { NormalizedLandmark } from "@/types";
import type { PlanExercise } from "@/lib/plan/types";

export type WorkoutPhase = "ready" | "running" | "paused" | "finished";
export type WorkoutSetPhase = "loading" | "awaiting_weight" | "performing" | "rest" | "done";
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

export interface WorkoutPlanState {
  planId: string | null;
  programId: string | null;
  planDate: string;
  planTitle: string;
  exercises: PlanExercise[];
  exerciseIndex: number;
  setIndex: number;
  sessionId: string | null;
  sessionExerciseId: string | null;
  loadWeightKg: number | null;
  setPhase: WorkoutSetPhase;
  totalReps: number;
}
