"use client";

import TwinPlaceholder from "@/components/visual/TwinPlaceholder";
import type { LatchedBodyData } from "@/types";

interface BiomechTwinPanelProps {
  latchedBody?: LatchedBodyData | null;
  locked?: boolean;
  tall?: boolean;
  compact?: boolean;
  showHud?: boolean;
  className?: string;
}

function FloorGrid() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] opacity-60"
      viewBox="0 0 400 180"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="floor-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {Array.from({ length: 12 }).map((_, i) => {
        const y = 20 + i * 14;
        const spread = 30 + i * 18;
        return (
          <line
            key={`h-${i}`}
            x1={200 - spread}
            y1={y}
            x2={200 + spread}
            y2={y}
            stroke="url(#floor-fade)"
            strokeWidth={0.8}
          />
        );
      })}
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
        <line
          key={`v-${i}`}
          x1={200 + i * 55}
          y1={10}
          x2={200 + i * 12}
          y2={170}
          stroke="#06b6d4"
          strokeOpacity={0.15}
          strokeWidth={0.8}
        />
      ))}
    </svg>
  );
}

export default function BiomechTwinPanel({
  latchedBody,
  locked = false,
  tall = true,
  compact,
  showHud = true,
  className = "",
}: BiomechTwinPanelProps) {
  const fat = latchedBody?.fatPercent ?? 22;
  const muscle = latchedBody?.musclePercent ?? 42;
  const placeholderMode = locked && latchedBody ? "waiting" : "offline";

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
      <FloorGrid />

      {showHud && (
        <>
          <div className="atlant-hud-pill absolute left-3 top-3 z-10">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Биомеханика
          </div>
          <div className="atlant-hud-pill absolute right-3 top-3 z-10 !border-emerald-200 !text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            В сети
          </div>
          {locked && latchedBody && (
            <>
              <div className="atlant-hud-tag absolute bottom-3 left-3 z-10">
                [ЖИР: {fat}%]
              </div>
              <div className="atlant-hud-tag absolute bottom-3 right-3 z-10">
                [МЫШЦЫ: {muscle}%]
              </div>
              <div className="atlant-hud-tag absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                [BIOMETRICS: STABLE]
              </div>
            </>
          )}
        </>
      )}

      <div className="relative z-[2] flex h-full items-center justify-center p-4">
        <TwinPlaceholder
          mode={placeholderMode}
          compact={compact}
          className="h-full w-full border-0 bg-white/40 shadow-none"
        />
      </div>

      {/* 3D twin temporarily disabled — awaiting high-poly static mesh
      <AvatarViewer asset={asset} ... />
      */}
    </div>
  );
}
