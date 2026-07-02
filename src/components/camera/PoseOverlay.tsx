"use client";

import { useEffect, useRef, useState } from "react";
import { POSE_CONNECTIONS } from "@/lib/pose/landmarks";
import type { NormalizedLandmark } from "@/types";

function tensionColor(tension: number): string {
  if (tension < 0.35) return "#22c55e";
  if (tension < 0.65) return "#f97316";
  return "#ef4444";
}

export default function PoseOverlay({
  landmarks,
  mirrored = true,
  tension = 0,
  mode = "training",
  motionDir = "",
}: {
  landmarks: NormalizedLandmark[] | null;
  mirrored?: boolean;
  tension?: number;
  mode?: "training" | "calibration";
  motionDir?: string;
}) {
  const color = mode === "calibration" ? "#4ade80" : tensionColor(tension);
  const prevRef = useRef<{ x: number; y: number } | null>(null);
  const velRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [gridPulse, setGridPulse] = useState(0);

  useEffect(() => {
    if (!landmarks) return;
    const lw = landmarks[15];
    const rw = landmarks[16];
    const wrist = (lw?.visibility ?? 0) > (rw?.visibility ?? 0) ? lw : rw;
    if (!wrist) return;
    if (prevRef.current) {
      velRef.current = {
        dx: wrist.x - prevRef.current.x,
        dy: wrist.y - prevRef.current.y,
      };
      const speed = Math.hypot(velRef.current.dx, velRef.current.dy);
      if (speed > 0.002) setGridPulse((p) => (p + 1) % 1000);
    }
    prevRef.current = { x: wrist.x, y: wrist.y };
  }, [landmarks]);

  if (!landmarks) return null;

  const w = 100;
  const h = 100;
  const tx = (x: number) => (mirrored ? (1 - x) * w : x * w);
  const ty = (y: number) => y * h;

  const gridSize = 3.4;
  const snapGrid = (x: number, y: number) => ({
    gx: Math.round(x / gridSize) * gridSize,
    gy: Math.round(y / gridSize) * gridSize,
  });

  const moving =
    Math.abs(velRef.current.dx) > 0.0015 ||
    Math.abs(velRef.current.dy) > 0.0015;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {mode === "calibration" &&
        moving &&
        [11, 12, 13, 14, 15, 16, 23, 24].map((idx) => {
          const p = landmarks[idx];
          if (!p || (p.visibility ?? 0) < 0.35) return null;
          const { gx, gy } = snapGrid(tx(p.x), ty(p.y));
          return (
            <rect
              key={`grid-${idx}-${gridPulse}`}
              x={gx - gridSize / 2}
              y={gy - gridSize / 2}
              width={gridSize}
              height={gridSize}
              fill="rgba(74, 222, 128, 0.22)"
              stroke="rgba(134, 239, 172, 0.5)"
              strokeWidth={0.15}
              rx={0.3}
            />
          );
        })}
      {POSE_CONNECTIONS.map(([a, b], i) => {
        const p1 = landmarks[a];
        const p2 = landmarks[b];
        if (!p1 || !p2) return null;
        if ((p1.visibility ?? 0) < 0.4 || (p2.visibility ?? 0) < 0.4)
          return null;
        return (
          <line
            key={i}
            x1={tx(p1.x)}
            y1={ty(p1.y)}
            x2={tx(p2.x)}
            y2={ty(p2.y)}
            stroke={color}
            strokeWidth={0.55 + tension * 0.4}
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      })}
      {[11, 13, 15, 12, 14, 16, 23, 25, 27, 24, 26, 28].map((idx) => {
        const p = landmarks[idx];
        if (!p || (p.visibility ?? 0) < 0.4) return null;
        return (
          <circle
            key={idx}
            cx={tx(p.x)}
            cy={ty(p.y)}
            r={0.85 + tension * 0.5}
            fill={color}
            opacity={0.92}
          />
        );
      })}
      {mode === "calibration" &&
        (() => {
          const ls = landmarks[11];
          const rs = landmarks[12];
          if (!ls || !rs) return null;
          const mid = {
            x: (ls.x + rs.x) / 2,
            y: (ls.y + rs.y) / 2,
          };
          const mdx = mirrored ? -velRef.current.dx : velRef.current.dx;
          const mdy = velRef.current.dy;
          const scale = 220;
          const ex = tx(mid.x) + mdx * scale;
          const ey = ty(mid.y) + mdy * scale;
          const show =
            Math.abs(mdx) > 0.001 || Math.abs(mdy) > 0.001 || motionDir;
          if (!show) return null;
          return (
            <g>
              <line
                x1={tx(mid.x)}
                y1={ty(mid.y)}
                x2={ex}
                y2={ey}
                stroke="#bbf7d0"
                strokeWidth={0.85}
                strokeLinecap="round"
                opacity={0.9}
              />
              <circle cx={ex} cy={ey} r={1} fill="#dcfce7" opacity={0.95} />
            </g>
          );
        })()}
    </svg>
  );
}
