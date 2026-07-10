import type { Sport, StrengthExercise } from "@/types";

export interface SessionVideoClip {
  id: string;
  sport: Sport;
  exercise?: StrengthExercise;
  label: string;
  expectedAction: string;
  mimeType: string;
  base64: string;
  /** Single frame (jpeg base64) for fast YOLO action check */
  previewFrameBase64?: string;
  durationMs: number;
  /** Sensor hint from MediaPipe (not ground truth) */
  sensorHint?: {
    speedMs?: number;
    accuracy?: number;
    elbowAngle?: number;
    fixed?: boolean;
  };
}

const clips: SessionVideoClip[] = [];
let nextId = 1;

export function resetSessionVideoClips(): void {
  clips.length = 0;
  nextId = 1;
}

export function addSessionVideoClip(
  entry: Omit<SessionVideoClip, "id">
): SessionVideoClip {
  const clip: SessionVideoClip = { ...entry, id: `clip-${nextId++}` };
  clips.push(clip);
  return clip;
}

export function getSessionVideoClips(): SessionVideoClip[] {
  return [...clips];
}

export function sessionVideoClipCount(): number {
  return clips.length;
}
