"use client";

import { useEffect, useState, useCallback } from "react";
import type { CameraFacing } from "@/lib/camera/deviceProfile";
import { canSwitchCameraFacing } from "@/lib/camera/deviceProfile";
import {
  buildVideoConstraints,
  detectMobileCameraCapabilities,
} from "@/lib/camera/mobileCamera";

export type CameraStatus = "loading" | "ready" | "error";

export function useCameraDevice(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  facing: CameraFacing
) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("loading");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    canSwitchCameraFacing().then(setCanSwitch);
  }, []);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCameraStatus("loading");
    setCameraError(null);

    (async () => {
      try {
        const caps = detectMobileCameraCapabilities();
        stream = await navigator.mediaDevices.getUserMedia({
          video: buildVideoConstraints(facing, caps),
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.playsInline = true;
          v.muted = true;
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
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };
  }, [active, facing, videoRef]);

  const toggleFacing = useCallback(() => {
    return facing === "user" ? "environment" : "user";
  }, [facing]);

  return {
    cameraStatus,
    cameraError,
    canSwitch,
    toggleFacing,
  };
}

/** @deprecated use useCameraDevice */
export function useCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean
) {
  const { cameraStatus, cameraError } = useCameraDevice(
    videoRef,
    active,
    "user"
  );
  return { cameraStatus, cameraError };
}
