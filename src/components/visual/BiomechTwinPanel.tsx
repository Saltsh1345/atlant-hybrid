"use client";

import { useMemo } from "react";
import AvatarViewer from "@/components/three/AvatarViewer";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import { criticalMusclesFromSession } from "@/lib/three/muscleGroups";
import type { LatchedBodyData, SessionSummary } from "@/types";

interface BiomechTwinPanelProps {
  latchedBody?: LatchedBodyData | null;
  locked?: boolean;
  tall?: boolean;
  compact?: boolean;
  showHud?: boolean;
  className?: string;
  lastSession?: SessionSummary | null;
  criticalMeshes?: string[];
  /** Soft dashboard look: no wireframe, no red “critical” scare, calm HUD */
  calm?: boolean;
}

export default function BiomechTwinPanel({
  latchedBody,
  locked = false,
  tall = true,
  compact,
  showHud = true,
  className = "",
  lastSession = null,
  criticalMeshes: criticalOverride,
  calm = false,
}: BiomechTwinPanelProps) {
  const { asset, ready, error: assetError } = useAvatarAsset();
  const fat = latchedBody?.fatPercent ?? 22;
  const muscle = latchedBody?.musclePercent ?? 42;
  const compositionKnown = locked && !!latchedBody;

  const criticalMeshes = useMemo(() => {
    // Explicit override always wins (live twin / training technique)
    if (criticalOverride?.length) return criticalOverride;
    // Dashboard calm preview: no scare red
    if (calm) return [];
    return criticalMusclesFromSession(lastSession);
  }, [calm, criticalOverride, lastSession]);

  const hasCritical = criticalMeshes.length > 0;
  const techniqueHint =
    !calm && lastSession?.formScore != null && lastSession.formScore < 55;

  return (
    <div
      className={`atlant-twin-panel relative overflow-hidden rounded-2xl ${
        calm ? "atlant-twin-panel--calm" : ""
      } ${
        compact
          ? "h-48"
          : tall
            ? "h-56 sm:h-64 md:h-72 lg:h-[min(480px,52vh)]"
            : "h-64"
      } ${className}`}
    >
      <div
        className={`absolute inset-0 ${
          calm ? "atlant-twin-bg-calm" : "atlant-twin-bg"
        }`}
      />

      {showHud && (
        <>
          <div
            className={`atlant-hud-pill absolute left-3 top-3 z-10 ${
              calm ? "atlant-hud-pill--calm" : ""
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                calm
                  ? "bg-[var(--neon-lime,#ccff00)]"
                  : hasCritical
                    ? "bg-red-500"
                    : "bg-orange-400"
              }`}
            />
            {calm ? "Голограмма" : "Биомеханика"}
          </div>
          <div
            className={`atlant-hud-pill absolute right-3 top-3 z-10 ${
              calm
                ? "atlant-hud-pill--calm"
                : hasCritical
                  ? "!border-red-200 !text-red-700"
                  : "!border-emerald-200 !text-emerald-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                calm
                  ? compositionKnown
                    ? "bg-cyan-400"
                    : "bg-cyan-700"
                  : hasCritical
                    ? "animate-pulse bg-red-500"
                    : "animate-pulse bg-emerald-500"
              }`}
            />
            {calm
              ? compositionKnown
                ? "Скан OK"
                : "MESH"
              : hasCritical
                ? "Критично"
                : "В сети"}
          </div>
          {compositionKnown && (
            <>
              <div
                className={`atlant-hud-tag absolute bottom-3 left-3 z-10 ${
                  calm ? "atlant-hud-tag--calm" : ""
                }`}
              >
                Жир {fat}%
              </div>
              <div
                className={`atlant-hud-tag absolute bottom-3 right-3 z-10 ${
                  calm ? "atlant-hud-tag--calm" : ""
                }`}
              >
                Мышцы {muscle}%
              </div>
              {!calm && techniqueHint && (
                <div className="atlant-hud-tag absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                  Техника: нужна работа
                </div>
              )}
            </>
          )}
          {!compositionKnown && (
            <div
              className={`atlant-hud-tag absolute bottom-3 left-1/2 z-10 -translate-x-1/2 ${
                calm ? "atlant-hud-tag--calm" : ""
              }`}
            >
              {calm ? "Пройдите скан для точного состава" : "Ожидание скана"}
            </div>
          )}
        </>
      )}

      <div className="relative z-[2] h-full min-h-[12rem] p-1">
        {assetError ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-white/5 text-center text-xs text-[#a3a3a3]">
            {assetError}
          </div>
        ) : (
          <AvatarViewer
            asset={asset ?? { url: "/avatar.glb", format: "glb" }}
            assetReady={ready}
            showWireframe={false}
            compositionMode={compositionKnown}
            fatPercent={fat}
            musclePercent={muscle}
            fatZones={latchedBody?.fatZones}
            criticalMeshes={criticalMeshes}
            idleAnimate
            theme="dark"
            fillHeight
            tall={tall}
            compact={compact}
            interactive
            calmLighting={calm}
          />
        )}
      </div>
    </div>
  );
}
