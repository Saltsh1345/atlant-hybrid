"use client";

import Button from "@/components/ui/Button";
import PoseOverlay from "@/components/camera/PoseOverlay";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAppStore } from "@/store/useAppStore";
import { criticalMusclesFromSession } from "@/lib/three/muscleGroups";
import { useRef, useEffect, useState, useMemo } from "react";
import type { NormalizedLandmark } from "@/types";

export default function TwinLiveScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const lastSession = useAppStore((s) => s.lastSession);
  const setPhase = useAppStore((s) => s.setPhase);

  const { cameraStatus, cameraError } = useCamera(videoRef, true);
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  const criticalMeshes = useMemo(
    () => criticalMusclesFromSession(lastSession),
    [lastSession]
  );

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
    <div className="relative min-h-dvh bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-45"
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

      <div className="relative z-10 flex min-h-dvh flex-col px-4 py-5">
        <button
          type="button"
          onClick={() => setPhase("dashboard")}
          className="mb-3 self-start text-sm text-white/80 hover:text-white"
        >
          ← Дашборд
        </button>

        <h1 className="mb-1 text-xl font-bold text-white">Цифровой двойник</h1>
        <p className="mb-3 text-xs text-white/60">
          Голографический mesh · мышцы и жир по скану · поза с камеры
        </p>

        {latchedBody && (
          <p className="mb-3 text-xs text-cyan-300">
            Жир {latchedBody.fatPercent}% · Мышцы {latchedBody.musclePercent}%
            {criticalMeshes.length > 0
              ? ` · критичных зон: ${criticalMeshes.length}`
              : ""}
          </p>
        )}

        <div className="mx-auto w-full max-w-2xl shrink-0">
          <BiomechTwinPanel
            latchedBody={latchedBody}
            locked={bodyDataLocked}
            lastSession={lastSession}
            criticalMeshes={criticalMeshes}
            landmarks={landmarks}
            live
            showHud
            calm
          />
        </div>

        <p className="mt-4 text-center text-[10px] text-white/50">
          Камера видна по краям. После скана жир теплее (янтарь), мышцы ярче
          (cyan). Слабая техника — мягкая подсветка групп.
        </p>

        <div className="mt-auto pt-4">
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => setPhase("dashboard")}
          >
            На дашборд
          </Button>
        </div>
      </div>
    </div>
  );
}
