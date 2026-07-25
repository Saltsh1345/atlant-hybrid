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

let sharedHandLandmarker: HandLandmarkerHandle | null = null;
let createPromise: Promise<HandLandmarkerHandle> | null = null;
let lastVideoTimestampMs = 0;

/**
 * WASM HandLandmarker stays alive for the tab session.
 * Recreating/closing during React remounts logs noisy TFLite INFO to stderr
 * and triggers false errors in the Next.js dev overlay.
 */
async function createHandLandmarker(): Promise<HandLandmarkerHandle> {
  const { FilesetResolver, HandLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const vision = await FilesetResolver.forVisionTasks(WASM);

  const options = {
    runningMode: "VIDEO" as const,
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  // Hand model always on CPU — pose landmarker keeps the GPU context.
  return (await HandLandmarker.createFromOptions(vision, {
    ...options,
    baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
  })) as HandLandmarkerHandle;
}

function ensureHandLandmarker(): Promise<HandLandmarkerHandle> {
  if (sharedHandLandmarker) {
    return Promise.resolve(sharedHandLandmarker);
  }
  if (createPromise) {
    return createPromise;
  }

  createPromise = createHandLandmarker()
    .then((landmarker) => {
      if (!sharedHandLandmarker) {
        sharedHandLandmarker = landmarker;
      }
      return sharedHandLandmarker;
    })
    .finally(() => {
      createPromise = null;
    });

  return createPromise;
}

function disposeHandLandmarkerOnPageExit(): void {
  if (!sharedHandLandmarker) return;
  try {
    sharedHandLandmarker.close();
  } catch {
    /* tab is closing */
  }
  sharedHandLandmarker = null;
  createPromise = null;
  lastVideoTimestampMs = 0;
}

/** Eager init so the first gesture check does not hit cold-start inside rAF. */
export function warmHandLandmarker(): Promise<HandLandmarkerHandle> {
  return ensureHandLandmarker();
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
  if (thumbTip.y < wrist.y - 0.04 && fourFingersFolded) return "thumbs_up";

  const openPalm =
    isAbove(indexTip, indexPip) &&
    isAbove(middleTip, middlePip) &&
    isAbove(ringTip, ringPip) &&
    isAbove(pinkyTip, pinkyPip) &&
    Math.abs(indexTip.x - pinkyTip.x) > 0.06;
  return openPalm ? "open_palm" : null;
}

export async function detectWorkoutGesture(
  video: HTMLVideoElement,
  timestampMs: number,
): Promise<WorkoutGesture | null> {
  if (video.readyState < 2) return null;

  try {
    const detector = await ensureHandLandmarker();
    const ts = Math.max(timestampMs, lastVideoTimestampMs + 1);
    lastVideoTimestampMs = ts;
    const result = detector.detectForVideo(video, ts);
    for (const hand of result.landmarks) {
      const gesture = classifyHandGesture(hand);
      if (gesture) return gesture;
    }
    return null;
  } catch {
    // MediaPipe VIDEO mode rejects non-monotonic timestamps and may log TFLite INFO to stderr.
    return null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", disposeHandLandmarkerOnPageExit);
}
