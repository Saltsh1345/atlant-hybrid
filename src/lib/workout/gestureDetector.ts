"use client";

import type { WorkoutGesture } from "@/lib/workout/types";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type HandPoint = { x: number; y: number; z: number };
type HandLandmarkerHandle = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => { landmarks: HandPoint[][] };
  close: () => void;
};

let handLandmarker: HandLandmarkerHandle | null = null;
let handPromise: Promise<HandLandmarkerHandle> | null = null;

async function ensureHandLandmarker(): Promise<HandLandmarkerHandle> {
  if (handLandmarker) return handLandmarker;
  if (handPromise) return handPromise;

  handPromise = (async () => {
    const { FilesetResolver, HandLandmarker } = await import(
      "@mediapipe/tasks-vision"
    );
    const vision = await FilesetResolver.forVisionTasks(WASM);
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.7,
      minHandPresenceConfidence: 0.7,
      minTrackingConfidence: 0.65,
    });
    return handLandmarker as HandLandmarkerHandle;
  })()
    .then((value) => {
      handLandmarker = value;
      return value;
    })
    .finally(() => {
      handPromise = null;
    });

  return handPromise;
}

function isAbove(a: HandPoint, b: HandPoint): boolean {
  return a.y < b.y - 0.035;
}

/** Classifies only the two deliberate control gestures needed in live mode. */
export function classifyHandGesture(points: HandPoint[]): WorkoutGesture | null {
  if (points.length < 21) return null;
  const wrist = points[0];
  const thumbTip = points[4];
  const indexTip = points[8];
  const middleTip = points[12];
  const ringTip = points[16];
  const pinkyTip = points[20];
  const indexPip = points[6];
  const middlePip = points[10];
  const ringPip = points[14];
  const pinkyPip = points[18];

  const fourFingersFolded =
    indexTip.y > indexPip.y - 0.005 &&
    middleTip.y > middlePip.y - 0.005 &&
    ringTip.y > ringPip.y - 0.005 &&
    pinkyTip.y > pinkyPip.y - 0.005;
  if (thumbTip.y < wrist.y - 0.1 && fourFingersFolded) return "thumbs_up";

  const openPalm =
    isAbove(indexTip, indexPip) &&
    isAbove(middleTip, middlePip) &&
    isAbove(ringTip, ringPip) &&
    isAbove(pinkyTip, pinkyPip) &&
    Math.abs(indexTip.x - pinkyTip.x) > 0.1;
  return openPalm ? "open_palm" : null;
}

export async function detectWorkoutGesture(
  video: HTMLVideoElement,
  timestampMs: number,
): Promise<WorkoutGesture | null> {
  const detector = await ensureHandLandmarker();
  const result = detector.detectForVideo(video, timestampMs);
  return classifyHandGesture(result.landmarks[0] ?? []);
}
