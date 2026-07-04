"use client";

import { useMemo } from "react";
import AvatarViewer from "@/components/three/AvatarViewer";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import {
  criticalMusclesFromSession,
} from "@/lib/three/muscleGroups";
import type { LatchedBodyData, SessionSummary } from "@/types";

interface BiomechTwinPanelProps {
  latchedBody?: LatchedBodyData | null;
  locked?: boolean;
  tall?: boolean;
  compact?: boolean;
  showHud?: boolean;
  className?: string;
  /** Last session — red critical muscles when technique was poor. */
  lastSession?: SessionSummary | null;
  criticalMeshes?: string[];
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
}: BiomechTwinPanelProps) {
  const { asset, ready, error: assetError } = useAvatarAsset();
  const fat = latchedBody?.fatPercent ?? 22;
  const muscle = latchedBody?.musclePercent ?? 42;
  const compositionKnown = locked && !!latchedBody;

  const criticalMeshes = useMemo(() => {
    if (criticalOverride?.length) return criticalOverride;
    return criticalMusclesFromSession(lastSession);
  }, [criticalOverride, lastSession]);

  const hasCritical = criticalMeshes.length > 0;

  return (
    <div
      className={`atlant-twin-panel relative overflow-hidden rounded-2xl ${
        compact
          ? "h-48"
          : tall
            ? "h-56 sm:h-64 md:h-72 lg:h-[min(480px,52vh)]"
            : "h-64"
      } ${className}`}
    >
      <div className="atlant-twin-bg absolute inset-0" />

      {showHud && (
        <>
          <div className="atlant-hud-pill absolute left-3 top-3 z-10">
            <span
              className={`h-2 w-2 rounded-full ${
                hasCritical ? "bg-red-500" : "bg-orange-400"
              }`}
            />
            Биомеханика
          </div>
          <div
            className={`atlant-hud-pill absolute right-3 top-3 z-10 ${
              hasCritical
                ? "!border-red-200 !text-red-700"
                : "!border-emerald-200 !text-emerald-700"
            }`}
          >
            <span
              className={`h-2 w-2 animate-pulse rounded-full ${
                hasCritical ? "bg-red-500" : "bg-emerald-500"
              }`}
            />
            {hasCritical ? "Критично" : "В сети"}
          </div>
          {compositionKnown && (
            <>
              <div className="atlant-hud-tag absolute bottom-3 left-3 z-10">
                [ЖИР: {fat}%]
              </div>
              <div className="atlant-hud-tag absolute bottom-3 right-3 z-10">
                [МЫШЦЫ: {muscle}%]
              </div>
              <div className="atlant-hud-tag absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                {hasCritical
                  ? "[ТЕХНИКА: КРИТИЧНО]"
                  : "[BIOMETRICS: STABLE]"}
              </div>
            </>
          )}
          {!compositionKnown && (
            <div className="atlant-hud-tag absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
              [ОЖИДАНИЕ СКАНА]
            </div>
          )}
        </>
      )}

      <div className="relative z-[2] h-full min-h-[12rem] p-1">
        {assetError ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-amber-50 text-center text-xs text-amber-800">
            {assetError}
          </div>
        ) : (
          <AvatarViewer
            asset={asset ?? { url: "/avatar.glb", format: "glb" }}
            assetReady={ready}
            showWireframe={!compositionKnown && !hasCritical}
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
          />
        )}
      </div>
    </div>
  );
}
