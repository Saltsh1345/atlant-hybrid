import { angle, LM } from "@/lib/pose/landmarks";
import type {
  LiveKinematics,
  NormalizedLandmark,
  Sport,
  StrengthExercise,
} from "@/types";

export type EliteActionId =
  | "jab"
  | "cross"
  | "hook"
  | "combo"
  | "forehand"
  | "backhand"
  | "serve"
  | "squat"
  | "bench"
  | "lunge";

export interface EliteFeatureRange {
  min: number;
  max: number;
  ideal: number;
  weight: number;
}

export interface EliteReference {
  id: EliteActionId;
  sport: Sport;
  labelRu: string;
  /** Pro dataset / literature this template aligns with */
  sources: string[];
  /** Which arm leads (boxing/tennis heuristic) */
  leadSide?: "left" | "right" | "both";
  features: {
    elbowAngle: EliteFeatureRange;
    torsoRotation: EliteFeatureRange;
    wristVelocityMs: EliteFeatureRange;
    spineFlexion?: EliteFeatureRange;
    kneeAngle?: EliteFeatureRange;
    backAngle?: EliteFeatureRange;
  };
  coachCues: string[];
}

export interface EliteFeatureSample {
  elbowAngle: number;
  torsoRotation: number;
  wristVelocityMs: number;
  spineFlexion: number;
  kneeAngle: number;
  backAngle: number;
  leadArmExtension?: number;
}

export interface EliteScoreResult {
  action: EliteActionId;
  actionMatch: number;
  techniqueVsElite: number;
  overall: number;
  matchedAction: EliteActionId;
  deviations: string[];
  cues: string[];
}

export interface ProDatasetSource {
  id: string;
  name: string;
  sport: Sport;
  url: string;
  classes: string[];
  license: string;
  notes: string;
}

export function kinematicsToFeatures(
  k: LiveKinematics,
  landmarks?: NormalizedLandmark[] | null
): EliteFeatureSample {
  let leadArmExtension = k.elbowAngle;
  if (landmarks?.length) {
    const l = landmarks[LM.L_SHOULDER];
    const le = landmarks[LM.L_ELBOW];
    const lw = landmarks[LM.L_WRIST];
    const r = landmarks[LM.R_SHOULDER];
    const re = landmarks[LM.R_ELBOW];
    const rw = landmarks[LM.R_WRIST];
    const leftExt = angle(l, le, lw);
    const rightExt = angle(r, re, rw);
    leadArmExtension = Math.max(leftExt, rightExt);
  }
  return {
    elbowAngle: k.elbowAngle,
    torsoRotation: Math.abs(180 - k.backAngle),
    wristVelocityMs: k.wristVelocityMs,
    spineFlexion: k.spineFlexion,
    kneeAngle: k.kneeAngle,
    backAngle: k.backAngle,
    leadArmExtension,
  };
}

export function exerciseToAction(ex: StrengthExercise): EliteActionId {
  return ex;
}
