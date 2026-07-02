export type AppPhase =
  | "welcome"
  | "registration"
  | "dashboard"
  | "twin-live"
  | "settings"
  | "calibration"
  | "sport-select"
  | "training"
  | "analysis";

export type CalibrationStep =
  | "idle"
  | "scan_start"
  | "body_analysis"
  | "clothing_check"
  | "data_received"
  | "turn_left"
  | "turn_right"
  | "center"
  | "profile_turn"
  | "squat"
  | "biomech_ready"
  | "visualization"
  | "complete";

export type Sport = "strength" | "boxing" | "tennis";

export type StrengthExercise = "squat" | "bench" | "lunge";

export type FitnessGoal =
  | "lose_weight"
  | "gain_muscle"
  | "maintain"
  | "performance";

export type TrackingMode = "idle" | "calibration" | "continuous";

export interface UserProfile {
  height: number;
  weight: number;
  age: number;
  goal: FitnessGoal;
  injuries: string;
}

/** Latched ONCE during calibration — never recalculated per frame */
export interface LatchedBodyData {
  fatPercent: number;
  musclePercent: number;
  leanMassKg: number;
  fatMassKg: number;
  lockedAt: string;
  clothingDetected?: boolean;
  scanNote?: string;
}

export interface LiveKinematics {
  bpm: number;
  velocityMs: number;
  powerW: number;
  fatiguePercent: number;
  kneeAngle: number;
  backAngle: number;
  elbowAngle: number;
  wristVelocityMs: number;
  punchSpeedMs: number | null;
  spineFlexion: number;
}

export interface KinematicSample {
  t: number;
  velocityMs: number;
  kneeAngle: number;
  wristVelocityMs: number;
  fatigue: number;
}

export interface SessionSummary {
  sport: Sport;
  durationSec: number;
  avgVelocity: number;
  peakPunchSpeed: number;
  reps?: number;
  punches?: number;
  swings?: number;
  exercise?: StrengthExercise;
  formScore?: number;
  peakVelocity?: number;
  samples: KinematicSample[];
  aiAnalysis: string;
  completedAt: string;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}
