"use client";

import { useEffect, useRef } from "react";
import { LM } from "@/lib/pose/landmarks";
import type { NormalizedLandmark } from "@/types";

interface PunchTrailProps {
  landmarks: NormalizedLandmark[] | null;
  active: boolean;
}

interface Point {
  x: number;
  y: number;
  t: number;
}

export default function PunchTrail({ landmarks, active }: PunchTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Point[]>([]);

  useEffect(() => {
    if (!active || !landmarks) return;

    const lWrist = landmarks[LM.L_WRIST];
    const rWrist = landmarks[LM.R_WRIST];
    const wrist =
      (lWrist.visibility ?? 0) > (rWrist.visibility ?? 0) ? lWrist : rWrist;

    if ((wrist.visibility ?? 0) > 0.5) {
      trailRef.current.push({
        x: 1 - wrist.x,
        y: wrist.y,
        t: Date.now(),
      });
      trailRef.current = trailRef.current
        .filter((p) => Date.now() - p.t < 500)
        .slice(-24);
    }
  }, [landmarks, active]);

  useEffect(() => {
    if (!active) return;
    let raf: number;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pts = trailRef.current;
      if (pts.length < 2) {
        raf = requestAnimationFrame(draw);
        return;
      }

      for (let i = 1; i < pts.length; i++) {
        const age = (Date.now() - pts[i].t) / 500;
        const alpha = 1 - age;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.9})`;
        ctx.lineWidth = 4 + (1 - age) * 6;
        ctx.lineCap = "round";
        ctx.moveTo(pts[i - 1].x * canvas.width, pts[i - 1].y * canvas.height);
        ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
        ctx.stroke();
      }

      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(
        last.x * canvas.width,
        last.y * canvas.height,
        12,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-15 h-full w-full"
    />
  );
}
