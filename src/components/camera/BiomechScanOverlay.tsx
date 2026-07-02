"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";
import type { CalibrationStep } from "@/types";
import { poseGuideProgress } from "@/lib/calibration/poseGuide";

const SWEEP_MS = 3000;

interface BiomechScanOverlayProps {
  landmarks: NormalizedLandmark[] | null;
  running: boolean;
  calibrationStep: CalibrationStep;
  motionDir: string;
}

function tx(x: number): number {
  return (1 - x) * 100;
}
function ty(y: number): number {
  return y * 100;
}

export default function BiomechScanOverlay({
  landmarks,
  running,
  calibrationStep,
  motionDir,
}: BiomechScanOverlayProps) {
  const [sweepPhase, setSweepPhase] = useState(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now();
    let raf: number;
    const loop = () => {
      setSweepPhase(
        ((performance.now() - startRef.current) % SWEEP_MS) / SWEEP_MS
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const progress = landmarks
    ? poseGuideProgress(calibrationStep, landmarks)
    : 0;
  const sweepY = sweepPhase * 100;
  const nearSweep = (yNorm: number) => Math.abs(ty(yNorm) - sweepY) < 10;

  const bodyContour = () => {
    if (!landmarks || !running) return null;
    const ls = landmarks[LM.L_SHOULDER];
    const rs = landmarks[LM.R_SHOULDER];
    const lh = landmarks[LM.L_HIP];
    const rh = landmarks[LM.R_HIP];
    if (!ls || !rs || !lh || !rh) return null;

    const top = Math.min(ls.y, rs.y) - 0.06;
    const bottom = Math.max(lh.y, rh.y) + 0.12;
    const left = Math.min(ls.x, lh.x) - 0.04;
    const right = Math.max(rs.x, rh.x) + 0.04;
    const midY = (top + bottom) / 2;
    const lit = nearSweep(midY);

    return (
      <ellipse
        cx={tx((left + right) / 2)}
        cy={ty(midY)}
        rx={((right - left) * 100) / 2}
        ry={((bottom - top) * 100) / 2}
        fill={lit ? "rgba(34, 211, 238, 0.22)" : "rgba(6, 182, 212, 0.06)"}
        stroke={lit ? "#22d3ee" : "rgba(6, 182, 212, 0.35)"}
        strokeWidth={lit ? 0.5 : 0.25}
        strokeDasharray={lit ? "none" : "1.5 2"}
      />
    );
  };

  const limbGlow = (a: number, b: number, c: number) => {
    const p1 = landmarks?.[a];
    const p2 = landmarks?.[b];
    const p3 = landmarks?.[c];
    if (!p1 || !p2 || !p3) return null;
    if ((p1.visibility ?? 0) < 0.3 || (p2.visibility ?? 0) < 0.3) return null;
    const midY = (p1.y + p2.y) / 2;
    const lit = running && nearSweep(midY);
    if (!lit) return null;
    return (
      <g key={`limb-${a}`}>
        <path
          d={`M ${tx(p1.x)} ${ty(p1.y)} Q ${tx(p2.x)} ${ty(p2.y)} ${tx(p3.x)} ${ty(p3.y)}`}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.2}
          opacity={0.9}
        />
        <circle cx={tx(p2.x)} cy={ty(p2.y)} r={2.2} fill="#a5f3fc" opacity={0.85} />
      </g>
    );
  };

  const dirArrow = () => {
    if (!running || progress >= 1) return null;
    let dx = 0;
    let dy = 0;
    if (calibrationStep === "turn_left") dx = -8;
    if (calibrationStep === "turn_right") dx = 8;
    if (calibrationStep === "squat") dy = 8;
    if (!dx && !dy && motionDir.includes("влево")) dx = -6;
    if (!dx && !dy && motionDir.includes("вправо")) dx = 6;
    if (!dx && !dy && motionDir.includes("вниз")) dy = 6;
    if (!dx && !dy) return null;
    return (
      <g opacity={0.95}>
        <defs>
          <marker
            id="bio-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#22d3ee" />
          </marker>
        </defs>
        <line
          x1={50}
          y1={32}
          x2={50 + dx}
          y2={32 + dy}
          stroke="#22d3ee"
          strokeWidth={1.4}
          markerEnd="url(#bio-arrow)"
        />
      </g>
    );
  };

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[11] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {bodyContour()}
      {limbGlow(LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST)}
      {limbGlow(LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST)}
      {dirArrow()}
      {running && progress > 0 && progress < 1 && (
        <rect
          x="1"
          y="96"
          width={Math.max(4, progress * 98)}
          height="1.5"
          rx="0.8"
          fill="#22d3ee"
        />
      )}
    </svg>
  );
}
