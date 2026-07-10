"use client";

import type { RefObject, ReactNode } from "react";
import type { NormalizedLandmark } from "@/types";
import type { CoachContext } from "@/lib/camera/positionCoach";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";
import { usePositionCoach } from "@/hooks/usePositionCoach";
import { deviceCameraProfile, detectDeviceKind } from "@/lib/camera/deviceProfile";
import { formatDistance } from "@/lib/camera/distanceEstimator";

/**
 * Static camera — no zoom/pan. User moves; AI coach guides position.
 */
export default function CoachCameraViewport({
  videoRef,
  landmarks,
  mirror = true,
  coachContext,
  coachActive = true,
  voiceCoach = true,
  heightCm,
  cameraCalibration,
  className = "",
  videoClassName = "",
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
  mirror?: boolean;
  coachContext: CoachContext | null;
  coachActive?: boolean;
  voiceCoach?: boolean;
  heightCm?: number;
  cameraCalibration?: CameraCalibration | null;
  className?: string;
  videoClassName?: string;
  children?: ReactNode;
}) {
  const device = deviceCameraProfile(detectDeviceKind());
  const coach = usePositionCoach(
    landmarks,
    coachContext,
    coachActive,
    voiceCoach,
    heightCm,
    cameraCalibration
  );

  const bannerColor = coach.ready
    ? "text-emerald-700 border-emerald-200 bg-emerald-50/95"
    : coach.issue === "no_body"
      ? "text-cyan-800 border-cyan-200 bg-white/95"
      : "text-amber-800 border-amber-200 bg-amber-50/95";

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className={`h-full w-full object-cover ${mirror ? "scale-x-[-1]" : ""} ${videoClassName}`}
        playsInline
        muted
        autoPlay
      />
      {children}

      {coachActive && coachContext && (
        <div
          className={`absolute top-24 left-1/2 z-[25] w-[94%] max-w-md -translate-x-1/2 rounded-xl border px-3 py-2.5 text-center shadow-md backdrop-blur-sm ${bannerColor}`}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest opacity-80">
            AI-тренер · {device.label}
            {coachContext.mode === "sport_setup" && " · настройка"}
            {coachContext.mode === "training" && " · тренировка"}
            {coachContext.mode === "calibration" && " · скан"}
          </p>
          <p className="text-sm font-semibold leading-snug">{coach.hint}</p>
          {coach.detail && !coach.ready && (
            <p className="mt-1 text-[11px] opacity-80">{coach.detail}</p>
          )}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                coach.ready ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.round(coach.progress * 100)}%` }}
            />
          </div>
          {coach.metrics && (
            <p className="mt-1 font-mono text-[9px] opacity-60">
              {coach.distance
                ? `Дальномер ${formatDistance(coach.distance.meters)} · цель ${Math.round(coach.distance.targetMin * 100)}–${Math.round(coach.distance.targetMax * 100)} см`
                : coach.metrics}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { usePositionCoach };
