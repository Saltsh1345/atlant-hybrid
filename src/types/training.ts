import type { Sport, StrengthExercise } from "@/types";

export type ExerciseCategory =
  | "hypertrophy"
  | "power"
  | "core"
  | "agility"
  | "technique-drill";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type ExerciseTrackingMode = "pose" | "guided";

/** Один подход в плане. */
export interface PlannedSet {
  reps: number;
  restSec: number;
  targetFormMin?: number;
  targetVelocityMs?: number;
}

/** Упражнение в дне программы. */
export interface WorkoutBlock {
  exerciseId: string;
  name: string;
  sport: Sport;
  strengthExercise?: StrengthExercise;
  sets: PlannedSet[];
  notes?: string;
  targetMuscles: string[];
  /** Слабая зона, которую закрывает блок */
  weakZoneId?: string;
  category?: ExerciseCategory;
  equipment?: string;
  description?: string;
  trackingMode?: ExerciseTrackingMode;
}

export interface TrainingDay {
  dayIndex: number;
  label: string;
  restDay?: boolean;
  blocks: WorkoutBlock[];
  estimatedMin: number;
}

export interface TrainingWeek {
  weekIndex: number;
  days: TrainingDay[];
}

export interface TrainingProgram {
  id: string;
  generatedAt: string;
  diagnosticId: string;
  title: string;
  weeks: TrainingWeek[];
}

/** Запись одного выполненного подхода. */
export interface SetRecord {
  setIndex: number;
  reps: number;
  restSecAfter: number;
  avgVelocityMs?: number;
  formScore?: number;
  completedAt: string;
}

/** История упражнения (все подходы за сессию). */
export interface ExerciseLog {
  id: string;
  exerciseId: string;
  name: string;
  sport: Sport;
  sets: SetRecord[];
  sessionCompletedAt: string;
  weakZonesTargeted?: string[];
}

export type WeakZoneSource =
  | "body_scan"
  | "posture"
  | "asymmetry"
  | "session_form"
  | "velocity"
  | "readiness";

/** Слабая зона / мышечный дефицит для плана и подсветки на двойнике. */
export interface WeakZone {
  id: string;
  muscleGroup: string;
  meshes: string[];
  side?: "L" | "R" | "both";
  severity: number;
  causes: string[];
  source: WeakZoneSource;
}

/** Полный отчёт видеодиагностики (камера + скан + сессии). */
export interface VideoDiagnosticReport {
  id: string;
  generatedAt: string;
  overallScore: number;
  label: string;
  weakZones: WeakZone[];
  strengths: string[];
  postureIssues: string[];
  asymmetry: {
    shoulders: number;
    hips: number;
    limbNotes: string[];
  };
  recommendations: string[];
  /** Какие слои аналитики использованы */
  sourcesUsed: string[];
}
