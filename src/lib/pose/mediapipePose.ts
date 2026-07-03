"use client";

import type { NormalizedLandmark } from "@/types";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type PoseLandmarkerHandle = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => { landmarks: NormalizedLandmark[][] };
  close: () => void;
};

let sharedLandmarker: PoseLandmarkerHandle | null = null;
let sharedUsers = 0;
let createPromise: Promise<PoseLandmarkerHandle> | null = null;

/**
 * WASM PoseLandmarker is kept alive for the whole tab session.
 * Calling close() during React remounts logs noisy INFO to stderr and
 * triggers false errors in the Next.js dev overlay.
 */
function disposeOnPageExit(): void {
  if (!sharedLandmarker) return;
  try {
    sharedLandmarker.close();
  } catch {
    /* tab is closing */
  }
  sharedLandmarker = null;
  sharedUsers = 0;
  createPromise = null;
}

/** MediaPipe GPU delegate needs a spare WebGL context; probe before attempting GPU. */
export function canUseMediaPipeGpu(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", {
        failIfMajorPerformanceCaveat: false,
        antialias: false,
        depth: false,
        stencil: false,
      }) ??
      canvas.getContext("webgl", {
        failIfMajorPerformanceCaveat: false,
        antialias: false,
        depth: false,
        stencil: false,
      });
    if (!gl) return false;
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
    return true;
  } catch {
    return false;
  }
}

async function createLandmarker(): Promise<PoseLandmarkerHandle> {
  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const vision = await FilesetResolver.forVisionTasks(WASM);

  const base = {
    runningMode: "VIDEO" as const,
    numPoses: 1,
  };

  const tryCreate = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      ...base,
      baseOptions: { modelAssetPath: MODEL, delegate },
    });

  if (canUseMediaPipeGpu()) {
    try {
      return await tryCreate("GPU");
    } catch {
      /* fall through to CPU */
    }
  }

  return tryCreate("CPU");
}

function ensureLandmarker(): Promise<PoseLandmarkerHandle> {
  if (sharedLandmarker) {
    return Promise.resolve(sharedLandmarker);
  }
  if (createPromise) {
    return createPromise;
  }

  createPromise = createLandmarker()
    .then((lm) => {
      if (!sharedLandmarker) {
        sharedLandmarker = lm;
      }
      return sharedLandmarker;
    })
    .finally(() => {
      createPromise = null;
    });

  return createPromise;
}

export async function acquirePoseLandmarker(): Promise<PoseLandmarkerHandle> {
  sharedUsers += 1;
  return ensureLandmarker();
}

export function releasePoseLandmarker(): void {
  sharedUsers = Math.max(0, sharedUsers - 1);
}

export function poseLandmarkerUserCount(): number {
  return sharedUsers;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", disposeOnPageExit);
}
