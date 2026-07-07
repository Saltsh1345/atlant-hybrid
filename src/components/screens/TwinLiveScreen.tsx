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
    <div className="relative min-h-dvh bg-background">
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
          className="mb-4 self-start text-sm text-foreground-secondary hover:text-foreground"
        >
          ← Дашборд
        </button>

        <h1 className="mb-1 text-xl font-bold text-foreground">
          Цифровой двойник
        </h1>
        <p className="mb-4 text-xs text-muted">
          Анатомический mesh · сетка пола · подсветка состава и техники
        </p>

        {latchedBody && (
          <p className="mb-3 text-xs text-success">
            Жир {latchedBody.fatPercent}% · Мышцы {latchedBody.musclePercent}%
            {criticalMeshes.length > 0
              ? ` · критичных зон: ${criticalMeshes.length}`
              : ""}
          </p>
        )}

        <div className="flex-1">
          <BiomechTwinPanel
            latchedBody={latchedBody}
            locked={bodyDataLocked}
            lastSession={lastSession}
            criticalMeshes={criticalMeshes}
            tall
            showHud
            className="h-full min-h-[320px]"
          />
        </div>

        <p className="mt-4 text-center text-[10px] text-muted">
          После скана — жир (янтарный) и мышцы (зелёный). После слабой техники —
          красная пульсация критичных групп.
        </p>

        <Button
          size="lg"
          variant="secondary"
          className="mt-4"
          onClick={() => setPhase("dashboard")}
        >
          На дашборд
        </Button>
      </div>
    </div>
  );
}
