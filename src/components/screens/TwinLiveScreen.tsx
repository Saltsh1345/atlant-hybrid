"use client";

import Button from "@/components/ui/Button";
import PoseOverlay from "@/components/camera/PoseOverlay";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import TwinPlaceholder from "@/components/visual/TwinPlaceholder";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAppStore } from "@/store/useAppStore";
import { useRef, useEffect, useState } from "react";
import type { NormalizedLandmark } from "@/types";

/** Полноэкранный живой цифровой двойник — камера + заглушка 3D */
export default function TwinLiveScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const kinematics = useAppStore((s) => s.kinematics);
  const setPhase = useAppStore((s) => s.setPhase);

  const { cameraStatus, cameraError } = useCamera(videoRef, true);
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      const lm = tick();
      if (lm) setLandmarks(lm);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  return (
    <div className="relative min-h-dvh bg-slate-50">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-30"
        playsInline
        muted
        autoPlay
      />
      <CameraStatusOverlay
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        poseReady={poseReady}
        poseError={poseError}
      />
      <PoseOverlay landmarks={landmarks} />

      <div className="relative z-10 flex min-h-dvh flex-col px-4 py-6">
        <button
          type="button"
          onClick={() => setPhase("dashboard")}
          className="mb-4 self-start text-sm text-slate-600 hover:text-slate-900"
        >
          ← Дашборд
        </button>

        <h1 className="mb-1 text-xl font-bold text-slate-900">
          Цифровой двойник
        </h1>
        <p className="mb-4 text-xs text-slate-500">
          Камера активна · 3D-модель в разработке
        </p>

        {latchedBody && (
          <p className="mb-3 text-xs text-emerald-600">
            Жир {latchedBody.fatPercent}% · Мышцы {latchedBody.musclePercent}%
          </p>
        )}

        <div className="flex-1">
          <TwinPlaceholder
            mode="offline"
            fatigue={kinematics.fatiguePercent}
            className="h-full min-h-[320px]"
          />
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          MediaPipe отслеживает позу. IK-аватар временно отключён.
        </p>

        <Button
          size="lg"
          variant="secondary"
          className="mt-4"
          onClick={() => setPhase("dashboard")}
        >
          Закрыть
        </Button>
      </div>
    </div>
  );
}
