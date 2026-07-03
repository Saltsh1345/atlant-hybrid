"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LM } from "@/lib/pose/landmarks";
import type { NormalizedLandmark } from "@/types";

export interface StrikeBurst {
  id: number;
  x: number;
  y: number;
  speed: number;
  sport: "boxing" | "tennis";
  type?: string;
  t: number;
}

interface Point {
  x: number;
  y: number;
  t: number;
  v: number;
}

interface StrikeEffectsProps {
  landmarks: NormalizedLandmark[] | null;
  active: boolean;
  sport: "boxing" | "tennis";
  burst: StrikeBurst | null;
}

function wristPoint(landmarks: NormalizedLandmark[]): Point | null {
  const l = landmarks[LM.L_WRIST];
  const r = landmarks[LM.R_WRIST];
  const w = (l.visibility ?? 0) > (r.visibility ?? 0) ? l : r;
  if ((w.visibility ?? 0) < 0.45) return null;
  return {
    x: 1 - w.x,
    y: w.y,
    t: Date.now(),
    v: 0,
  };
}

function elbowWrist(landmarks: NormalizedLandmark[]) {
  const lW = landmarks[LM.L_WRIST];
  const rW = landmarks[LM.R_WRIST];
  const useLeft = (lW.visibility ?? 0) > (rW.visibility ?? 0);
  const wrist = useLeft ? lW : rW;
  const elbow = landmarks[useLeft ? LM.L_ELBOW : LM.R_ELBOW];
  if ((wrist.visibility ?? 0) < 0.4) return null;
  return {
    ex: 1 - elbow.x,
    ey: elbow.y,
    wx: 1 - wrist.x,
    wy: wrist.y,
  };
}

export default function StrikeEffects({
  landmarks,
  active,
  sport,
  burst,
}: StrikeEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Point[]>([]);
  const burstsRef = useRef<StrikeBurst[]>([]);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastBurstId = useRef(0);

  landmarksRef.current = landmarks;

  useEffect(() => {
    if (!burst || burst.id === lastBurstId.current) return;
    lastBurstId.current = burst.id;
    burstsRef.current.push(burst);
    burstsRef.current = burstsRef.current.filter(
      (b) => Date.now() - b.t < 900
    );
  }, [burst]);

  useEffect(() => {
    if (!active || !landmarks) return;
    const p = wristPoint(landmarks);
    if (!p) return;
    const prev = trailRef.current[trailRef.current.length - 1];
    const v = prev
      ? Math.hypot(p.x - prev.x, p.y - prev.y) / Math.max(0.016, (p.t - prev.t) / 1000)
      : 0;
    trailRef.current.push({ ...p, v });
    trailRef.current = trailRef.current
      .filter((pt) => Date.now() - pt.t < 600)
      .slice(-32);
  }, [landmarks, active]);

  useEffect(() => {
    if (!active) return;
    let raf: number;

    const palette =
      sport === "boxing"
        ? { core: "249, 115, 22", glow: "251, 146, 60", accent: "239, 68, 68" }
        : { core: "16, 185, 129", glow: "52, 211, 153", accent: "6, 182, 212" };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const arm = landmarksRef.current
        ? elbowWrist(landmarksRef.current)
        : null;
      if (arm) {
        const grad = ctx.createLinearGradient(
          arm.ex * w,
          arm.ey * h,
          arm.wx * w,
          arm.wy * h
        );
        grad.addColorStop(0, `rgba(${palette.glow}, 0.15)`);
        grad.addColorStop(1, `rgba(${palette.core}, 0.55)`);
        ctx.beginPath();
        ctx.moveTo(arm.ex * w, arm.ey * h);
        ctx.lineTo(arm.wx * w, arm.wy * h);
        ctx.strokeStyle = grad;
        ctx.lineWidth = sport === "tennis" ? 5 : 4;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      const pts = trailRef.current;
      for (let i = 1; i < pts.length; i++) {
        const age = (Date.now() - pts[i].t) / 600;
        const alpha = (1 - age) * 0.95;
        const speedBoost = Math.min(1.8, 1 + pts[i].v * 2);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${palette.core}, ${alpha})`;
        ctx.lineWidth = (3 + (1 - age) * 8) * speedBoost;
        ctx.lineCap = "round";
        ctx.shadowColor = `rgba(${palette.glow}, ${alpha * 0.8})`;
        ctx.shadowBlur = sport === "boxing" ? 14 : 18;
        ctx.moveTo(pts[i - 1].x * w, pts[i - 1].y * h);
        ctx.lineTo(pts[i].x * w, pts[i].y * h);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        const r = sport === "boxing" ? 10 : 12;
        ctx.beginPath();
        ctx.arc(last.x * w, last.y * h, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${palette.accent}, 0.75)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(last.x * w, last.y * h, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const now = Date.now();
      burstsRef.current = burstsRef.current.filter((b) => now - b.t < 900);

      for (const b of burstsRef.current) {
        const age = (now - b.t) / 900;
        const bx = b.x * w;
        const by = b.y * h;
        const ringR = 20 + age * (sport === "boxing" ? 120 : 100);
        const ringA = (1 - age) * 0.7;

        ctx.beginPath();
        ctx.arc(bx, by, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${palette.core}, ${ringA})`;
        ctx.lineWidth = 4 - age * 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bx, by, ringR * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${palette.accent}, ${ringA * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (sport === "boxing") {
          const rays = 8;
          for (let i = 0; i < rays; i++) {
            const a = (i / rays) * Math.PI * 2 + age * 0.5;
            const len = 18 + age * 50;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
            ctx.strokeStyle = `rgba(${palette.glow}, ${(1 - age) * 0.85})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.arc(bx, by, 28 + age * 40, -Math.PI * 0.85, -Math.PI * 0.15);
          ctx.strokeStyle = `rgba(${palette.glow}, ${(1 - age) * 0.9})`;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.font = `bold ${Math.round(18 + (1 - age) * 10)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,255,255,${(1 - age) * 0.95})`;
        ctx.strokeStyle = `rgba(${palette.core},${(1 - age) * 0.8})`;
        ctx.lineWidth = 3;
        const label = `${b.speed.toFixed(1)} м/с`;
        ctx.strokeText(label, bx, by - 24 - age * 30);
        ctx.fillText(label, bx, by - 24 - age * 30);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, sport]);

  if (!active) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      />
      <AnimatePresence>
        {burst && (
          <motion.div
            key={burst.id}
            className="pointer-events-none absolute z-[18]"
            style={{
              left: `${burst.x * 100}%`,
              top: `${burst.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div
              className={`rounded-full px-3 py-1 text-center shadow-lg backdrop-blur-sm ${
                sport === "boxing"
                  ? "border border-orange-300/60 bg-orange-500/25 text-orange-50"
                  : "border border-emerald-300/60 bg-emerald-500/25 text-emerald-50"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest">
                {sport === "boxing" ? "Удар" : "Замах"}
              </p>
              <p className="font-mono text-xl font-black tabular-nums">
                {burst.speed.toFixed(2)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
