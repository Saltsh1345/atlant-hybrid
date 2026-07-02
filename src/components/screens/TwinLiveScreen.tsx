"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import AvatarViewer from "@/components/three/AvatarViewer";
import PoseOverlay from "@/components/camera/PoseOverlay";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import { useAppStore } from "@/store/useAppStore";
import type { NormalizedLandmark } from "@/types";

/** Полноэкранный живой цифровой двойник — камера + 3D-аватар в реальном времени */
export default function TwinLiveScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const { asset } = useAvatarAsset();
  const latchedBody = useAppStore((s) => s.latchedBody);
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
    <div className="relative min-h-dvh bg-slate-900">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-50"
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
          className="mb-4 self-start text-sm text-white/80 hover:text-white"
        >
          ← Дашборд
        </button>

        <h1 className="mb-1 text-xl font-bold text-white">Цифровой двойник</h1>
        <p className="mb-4 text-xs text-slate-300">Живой режим · синхронизация с камерой</p>

        {latchedBody && (
          <p className="mb-3 text-xs text-emerald-300">
            🔒 Жир {latchedBody.fatPercent}% · Мышцы {latchedBody.musclePercent}%
          </p>
        )}

        <div className="flex-1">
          <AvatarViewer
            asset={asset}
            showWireframe={false}
            landmarks={landmarks}
            tall
          />
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          Двигайтесь — аватар повторяет позу MediaPipe. Состав тела не
          пересчитывается.
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
