"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";
import type { CalibrationStep } from "@/types";
import { poseGuideProgress } from "@/lib/calibration/poseGuide";

const SWEEP_MS = 2800;

interface ScanEffectsOverlayProps {
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

export default function ScanEffectsOverlay({
  landmarks,
  running,
  calibrationStep,
  motionDir,
}: ScanEffectsOverlayProps) {
  const [sweepPhase, setSweepPhase] = useState(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now();
    let raf: number;
    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      setSweepPhase((elapsed % SWEEP_MS) / SWEEP_MS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const progress = landmarks
    ? poseGuideProgress(calibrationStep, landmarks)
    : 0;

  const sweepY = sweepPhase * 100;
  const nearSweep = (yNorm: number) => Math.abs(ty(yNorm) - sweepY) < 9;

  const highlightJoint = (idx: number) => {
    const p = landmarks?.[idx];
    if (!p || (p.visibility ?? 0) < 0.35) return null;
    const lit = running && nearSweep(p.y);
    return (
      <circle
        key={`j-${idx}`}
        cx={tx(p.x)}
        cy={ty(p.y)}
        r={lit ? 2.4 : 1.2}
        fill={lit ? "#4ade80" : "#86efac"}
        opacity={lit ? 1 : 0.5}
      />
    );
  };

  const torsoGlow = () => {
    if (!landmarks || !running) return null;
    const ls = landmarks[LM.L_SHOULDER];
    const rs = landmarks[LM.R_SHOULDER];
    const lh = landmarks[LM.L_HIP];
    const rh = landmarks[LM.R_HIP];
    if (!ls || !rs || !lh || !rh) return null;
    const top = Math.min(ls.y, rs.y);
    const bottom = Math.max(lh.y, rh.y);
    const midY = (top + bottom) / 2;
    if (!nearSweep(midY)) return null;
    const left = Math.min(tx(ls.x), tx(rs.x), tx(lh.x), tx(rh.x)) - 2;
    const right = Math.max(tx(ls.x), tx(rs.x), tx(lh.x), tx(rh.x)) + 2;
    return (
      <rect
        x={left}
        y={ty(top) - 2}
        width={right - left}
        height={ty(bottom) - ty(top) + 4}
        fill="rgba(74, 222, 128, 0.18)"
        stroke="rgba(187, 247, 208, 0.7)"
        strokeWidth={0.4}
        rx={2}
      />
    );
  };

  const bicepHighlight = (shoulder: number, elbow: number, wrist: number) => {
    const s = landmarks?.[shoulder];
    const e = landmarks?.[elbow];
    const w = landmarks?.[wrist];
    if (!s || !e || !w) return null;
    if ((s.visibility ?? 0) < 0.35 || (e.visibility ?? 0) < 0.35) return null;
    const midY = (s.y + e.y) / 2;
    const lit = running && nearSweep(midY);
    if (!lit) return null;
    return (
      <g key={`bicep-${shoulder}`}>
        <line
          x1={tx(s.x)}
          y1={ty(s.y)}
          x2={tx(e.x)}
          y2={ty(e.y)}
          stroke="#bbf7d0"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={1}
        />
        <line
          x1={tx(e.x)}
          y1={ty(e.y)}
          x2={tx(w.x)}
          y2={ty(w.y)}
          stroke="#86efac"
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={0.85}
        />
        <circle cx={tx(e.x)} cy={ty(e.y)} r={1.8} fill="#dcfce7" opacity={0.95} />
      </g>
    );
  };

  const dirArrow = () => {
    if (!running || progress >= 1) return null;
    let dx = 0;
    let dy = 0;
    if (calibrationStep === "turn_left") dx = -7;
    if (calibrationStep === "turn_right") dx = 7;
    if (calibrationStep === "squat") dy = 7;
    if (!dx && !dy && motionDir.includes("влево")) dx = -6;
    if (!dx && !dy && motionDir.includes("вправо")) dx = 6;
    if (!dx && !dy && motionDir.includes("вниз")) dy = 6;
    if (!dx && !dy) return null;
    const cx = 50;
    const cy = 38;
    return (
      <g opacity={0.92}>
        <defs>
          <marker
            id="scan-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4"
            refY="2.5"
            orient="auto"
          >
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#bbf7d0" />
          </marker>
        </defs>
        <line
          x1={cx}
          y1={cy}
          x2={cx + dx}
          y2={cy + dy}
          stroke="#bbf7d0"
          strokeWidth={1.3}
          markerEnd="url(#scan-arrow)"
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
      {torsoGlow()}
      {landmarks && (
        <>
          {[11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].map(highlightJoint)}
          {bicepHighlight(LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST)}
          {bicepHighlight(LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST)}
        </>
      )}
      {dirArrow()}
      {running && progress > 0 && progress < 1 && (
        <rect
          x="2"
          y="90"
          width={Math.max(5, progress * 96)}
          height="2.2"
          rx="1"
          fill="#4ade80"
          opacity={0.9}
        />
      )}
    </svg>
  );
}
