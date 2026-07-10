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
  | "complete"
  /** Laptop scan: upper body + profile turns + 360° (no squat) */
  | "upper_body"
  | "arms_up"
  | "rotate_360"
  | "step_back"
  | "squat_lower"
  | "analyzing";

/** 0–1 intensity of fat draw on avatar zones (from Gemini body analysis). */
export interface FatZoneMap {
  abdomen: number;
  chest: number;
  back: number;
  hips: number;
  thighs: number;
  arms: number;
}

export interface PostureReport {
  spine: string;
  shoulders: string;
  hips: string;
  alignment: string;
}

export interface HealthSleepRecord {
  startTime: string;
  endTime: string;
  durationMin: number;
  phases?: Array<{ phase: string; durationMin: number }>;
}

export interface HealthHeartRatePoint {
  t: string;
  bpm: number;
}

export interface HealthMetricsSnapshot {
  fetchedAt: string;
  sleep?: {
    lastNight?: HealthSleepRecord | null;
  };
  heartRate?: {
    restingBpm?: number | null;
    points?: HealthHeartRatePoint[];
  };
  spo2?: {
    latest?: number | null;
  };
  stress?: {
    latest?: number | null;
  };
}

export interface HealthReadinessBreakdown {
  sleepScore: number;
  hrScore: number;
  spo2Score: number;
  stressScore: number;
}

export interface HealthReadiness {
  score: number;
  breakdown: HealthReadinessBreakdown;
  metrics: HealthMetricsSnapshot;
}

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
  fatZones?: FatZoneMap;
  posture?: PostureReport;
  geminiReport?: string;
  source?: "gemini" | "local";
  /** Measured / estimated dimensions from scan (cm). */
  anthropometrics?: import("@/lib/bio/anthropometry").BodyAnthropometrics;
  /** Body proportion fingerprint for re-verification. */
  bioSignature?: import("@/lib/bio/bodySignature").BodyBioSignature;
  /** Scan trust score 0–100 and tier. */
  scanQuality?: import("@/lib/bio/scanQuality").BioScanQuality;
  /** Total body mass used for kg breakdown (from profile). */
  totalWeightKg?: number;
  /** Stature used in analysis (cm). */
  heightCm?: number;
  heightSource?: "profile" | "measured" | "estimated";
  clothingReason?: string;
  clothingConfidence?: number;
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
