"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { POSE_CONNECTIONS } from "@/lib/pose/landmarks";
import type { NormalizedLandmark } from "@/types";
import type { WorkoutAngles } from "@/lib/workout/types";

export default function WorkoutPoseOverlay({
  landmarksRef,
  angles,
  mirrored = true,
}: {
  landmarksRef: RefObject<NormalizedLandmark[] | null>;
  angles: WorkoutAngles;
  mirrored?: boolean;
}) {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);

  useEffect(() => {
    let alive = true;
    let lastDraw = 0;
    let raf = 0;
    const draw = (now: number) => {
      if (!alive) return;
      if (now - lastDraw > 120) {
        lastDraw = now;
        setLandmarks(landmarksRef.current);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [landmarksRef]);

  if (!landmarks) return null;
  const tx = (x: number) => (mirrored ? (1 - x) * 100 : x * 100);
  const ty = (y: number) => y * 100;
  const labels = [
    { index: 13, label: angles.leftElbow },
    { index: 14, label: angles.rightElbow },
    { index: 25, label: angles.leftKnee },
    { index: 26, label: angles.rightKnee },
  ];

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {POSE_CONNECTIONS.map(([a, b]) => {
        const from = landmarks[a];
        const to = landmarks[b];
        if (!from || !to || (from.visibility ?? 0) < 0.4 || (to.visibility ?? 0) < 0.4) return null;
        return <line key={`${a}-${b}`} x1={tx(from.x)} y1={ty(from.y)} x2={tx(to.x)} y2={ty(to.y)} stroke="#22d3ee" strokeWidth="0.55" opacity="0.9" />;
      })}
      {landmarks.map((point, index) =>
        (point.visibility ?? 0) < 0.4 ? null : (
          <circle key={index} cx={tx(point.x)} cy={ty(point.y)} r="0.75" fill="#67e8f9" />
        ),
      )}
      {labels.map(({ index, label }) => {
        const point = landmarks[index];
        if (!point || label === null) return null;
        return (
          <text key={index} x={tx(point.x) + 1.2} y={ty(point.y) - 1.2} fill="#cffafe" fontSize="3.2">
            {Math.round(label)}°
          </text>
        );
      })}
    </svg>
  );
}
