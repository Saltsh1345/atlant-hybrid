"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { NormalizedLandmark } from "@/types";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type CameraStatus = "loading" | "ready" | "error";

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
    close: () => void;
  } | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [poseError, setPoseError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setPoseReady(false);
    setPoseError(null);

    (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );
        const vision = await FilesetResolver.forVisionTasks(WASM);
        let lm;
        try {
          lm = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch {
          lm = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }
        if (!cancelled) {
          landmarkerRef.current = lm;
          setPoseReady(true);
        } else {
          lm.close();
        }
      } catch {
        if (!cancelled) {
          setPoseError("Не удалось загрузить MediaPipe. Проверьте интернет.");
        }
      }
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setPoseReady(false);
    };
  }, [enabled]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) return null;
    const result = lm.detectForVideo(video, performance.now());
    landmarksRef.current = result.landmarks[0] ?? null;
    return landmarksRef.current;
  }, [videoRef]);

  return { tick, poseReady, poseError };
}

export function useCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean
) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("loading");
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCameraStatus("loading");
    setCameraError(null);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
          setCameraStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setCameraStatus("error");
          setCameraError(
            "Нет доступа к камере. Разрешите камеру в настройках браузера."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, videoRef]);

  return { cameraStatus, cameraError };
}
