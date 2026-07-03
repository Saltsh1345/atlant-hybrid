"use client";

import type { RefObject, ReactNode } from "react";
import type { NormalizedLandmark } from "@/types";
import type { Sport } from "@/types";
import { useAutoFrame } from "@/hooks/useAutoFrame";

export default function AutoFrameViewport({
  videoRef,
  landmarks,
  active,
  sport,
  className = "",
  videoClassName = "",
  voiceNudges = true,
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
  active: boolean;
  sport?: Sport;
  className?: string;
  videoClassName?: string;
  voiceNudges?: boolean;
  children?: ReactNode;
}) {
  const frame = useAutoFrame(landmarks, active, sport, voiceNudges);

  const distanceColor =
    frame.distance === "ok"
      ? "text-emerald-600 border-emerald-200 bg-emerald-50/90"
      : frame.distance === "searching"
        ? "text-cyan-700 border-cyan-200 bg-white/90"
        : "text-amber-700 border-amber-200 bg-amber-50/90";

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="relative h-full w-full will-change-transform"
        style={{
          transform: `scale(${frame.scale.toFixed(3)})`,
          transformOrigin: `${(frame.originX * 100).toFixed(1)}% ${(frame.originY * 100).toFixed(1)}%`,
          transition: "transform 140ms ease-out",
        }}
      >
        <video
          ref={videoRef}
          className={`h-full w-full scale-x-[-1] object-contain ${videoClassName}`}
          playsInline
          muted
          autoPlay
        />
        {children}
      </div>

      {active && (
        <div
          className={`absolute top-28 left-1/2 z-[25] max-w-[92%] -translate-x-1/2 rounded-xl border px-3 py-2 text-center shadow-sm backdrop-blur-sm ${distanceColor}`}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest opacity-80">
            AutoFrame
            {sport === "boxing" && " · бокс"}
            {sport === "tennis" && " · теннис"}
            {sport === "strength" && " · силовые"}
          </p>
          <p className="text-xs font-medium">{frame.hint}</p>
          {frame.bodyHeight > 0 && (
            <p className="mt-0.5 font-mono text-[9px] opacity-70">
              zoom {(frame.scale * 100).toFixed(0)}% · рост{" "}
              {(frame.bodyHeight * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}
