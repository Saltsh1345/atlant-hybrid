"use client";

import { useMemo } from "react";
import AvatarViewer from "@/components/three/AvatarViewer";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import { fatZonesFromPercent } from "@/lib/body/fatZones";
import { criticalMusclesFromSession } from "@/lib/three/muscleGroups";
import type { LatchedBodyData, NormalizedLandmark, SessionSummary } from "@/types";

interface BiomechTwinPanelProps {
  latchedBody?: LatchedBodyData | null;
  locked?: boolean;
  tall?: boolean;
  compact?: boolean;
  showHud?: boolean;
  className?: string;
  lastSession?: SessionSummary | null;
  criticalMeshes?: string[];
  landmarks?: NormalizedLandmark[] | null;
  /** Soft dashboard look: no wireframe, no red “critical” scare, calm HUD */
  calm?: boolean;
  /** Live camera screen: full hologram over video, not tiny PIP */
  live?: boolean;
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
  landmarks = null,
  calm = false,
  live = false,
}: BiomechTwinPanelProps) {
  const { asset, ready, error: assetError } = useAvatarAsset();
  const compositionKnown = locked && !!latchedBody;
  const fat = compositionKnown ? latchedBody!.fatPercent : undefined;
  const muscle = compositionKnown ? latchedBody!.musclePercent : undefined;
  const fatZones = useMemo(() => {
    if (!compositionKnown || fat == null) return undefined;
    return fatZonesFromPercent(fat, latchedBody?.fatZones);
  }, [compositionKnown, fat, latchedBody?.fatZones]);
  const poseLinked = !!landmarks?.length;

  const criticalMeshes = useMemo(() => {
    if (criticalOverride?.length) return criticalOverride;
    if (calm && !live) return [];
    return criticalMusclesFromSession(lastSession);
  }, [calm, live, criticalOverride, lastSession]);

  const hasCritical = criticalMeshes.length > 0;
  const techniqueHint =
    !calm && lastSession?.formScore != null && lastSession.formScore < 55;

  const panelTone = live ? "live" : calm ? "calm" : "default";

  return (
    <div
      className={`atlant-twin-panel relative overflow-hidden rounded-2xl ${
        panelTone === "live"
          ? "atlant-twin-panel--live"
          : panelTone === "calm"
            ? "atlant-twin-panel--calm"
            : ""
      } ${
        live
          ? "h-[min(52vh,460px)] w-full"
          : compact
            ? "h-48"
            : tall
              ? "h-56 sm:h-64 md:h-72 lg:h-[min(480px,52vh)]"
              : "h-64"
      } ${className}`}
    >
      <div
        className={`absolute inset-0 ${
          live
            ? "atlant-twin-bg-live"
            : calm
              ? "atlant-twin-bg-calm"
              : "atlant-twin-bg"
        }`}
      />

      {showHud && (
        <>
          <div
            className={`atlant-hud-pill absolute left-3 top-3 z-10 ${
              calm || live ? "atlant-hud-pill--calm" : ""
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                calm || live
                  ? "bg-[var(--neon-lime,#ccff00)]"
                  : hasCritical
                    ? "bg-red-500"
                    : "bg-orange-400"
              }`}
            />
            {live ? "Живой двойник" : calm ? "Голограмма" : "Биомеханика"}
          </div>
          <div
            className={`atlant-hud-pill absolute right-3 top-3 z-10 ${
              calm || live
                ? "atlant-hud-pill--calm"
                : hasCritical
                  ? "!border-red-200 !text-red-700"
                  : "!border-emerald-200 !text-emerald-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                calm || live
                  ? compositionKnown
                    ? "bg-cyan-400"
                    : "bg-cyan-700"
                  : hasCritical
                    ? "animate-pulse bg-red-500"
                    : "animate-pulse bg-emerald-500"
              }`}
            />
            {calm || live
              ? compositionKnown
                ? "Скан OK"
                : "MESH"
              : hasCritical
                ? "Критично"
                : "В сети"}
          </div>
          {compositionKnown && fat != null && muscle != null && (
            <>
              <div
                className={`atlant-hud-tag absolute bottom-3 left-3 z-10 border-[rgba(251,191,120,0.45)] text-[rgb(253,186,116)] ${
                  calm ? "atlant-hud-tag--calm" : ""
                }`}
                title="Тёплый персиковый тон на животе и бёдрах = жировые зоны"
              >
                Жир {fat}%
              </div>
              <div
                className={`atlant-hud-tag absolute bottom-3 right-3 z-10 border-[rgba(34,211,238,0.5)] text-cyan-300 ${
                  calm ? "atlant-hud-tag--calm" : ""
                }`}
                title="Циан и контур = мышечная масса"
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
              {calm
                ? "Нейтральный twin · пройдите скан"
                : "Нейтральный twin · ожидание скана"}
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
            fatZones={fatZones}
            criticalMeshes={criticalMeshes}
            landmarks={landmarks}
            idleAnimate={live ? !poseLinked : true}
            theme="dark"
            fillHeight
            tall={!compact}
            compact={compact}
            interactive={!live}
            calmLighting={calm || live}
            frameFullBody={!compact}
          />
        )}
      </div>
    </div>
  );
}
