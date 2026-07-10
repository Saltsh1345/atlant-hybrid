"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import {
  acquirePoseLandmarker,
  releasePoseLandmarker,
} from "@/lib/pose/mediapipePose";

export function usePoseTracker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const landmarkerRef = useRef<{
    detectForVideo: (
      v: HTMLVideoElement,
      t: number
    ) => { landmarks: NormalizedLandmark[][] };
  } | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [poseError, setPoseError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setPoseReady(false);
    setPoseError(null);

    acquirePoseLandmarker()
      .then((lm) => {
        if (cancelled) {
          releasePoseLandmarker();
          return;
        }
        landmarkerRef.current = lm;
        setPoseReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPoseError(
            "MediaPipe недоступен: нет WebGL или слабое GPU. Попробуйте Chrome/Edge или обновите страницу."
          );
        }
      });

    return () => {
      cancelled = true;
      landmarkerRef.current = null;
      releasePoseLandmarker();
      setPoseReady(false);
    };
  }, [enabled]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) return null;
    try {
      const result = lm.detectForVideo(video, performance.now());
      landmarksRef.current = result.landmarks[0] ?? null;
      return landmarksRef.current;
    } catch {
      return landmarksRef.current;
    }
  }, [videoRef]);

  return { tick, poseReady, poseError };
}

export { useCamera, useCameraDevice } from "@/hooks/useCameraDevice";
export type { CameraStatus } from "@/hooks/useCameraDevice";
