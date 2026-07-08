"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LiveKinematics, Sport, StrengthExercise } from "@/types";
import { exerciseLabel } from "@/lib/pose/exercises";

interface WorkoutFocusHUDProps {
  sport: Sport;
  kinematics: LiveKinematics;
  exercise?: StrengthExercise | null;
  reps?: number;
  formScore?: number;
  elapsedSec?: number;
  strikeLabel?: string;
  lastStrikeSpeed?: number | null;
  strikeFlash?: boolean;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WorkoutFocusHUD({
  sport,
  kinematics,
  exercise,
  reps = 0,
  formScore = 0,
  elapsedSec = 0,
  strikeLabel,
  lastStrikeSpeed,
  strikeFlash,
}: WorkoutFocusHUDProps) {
  const bpm = Math.round(kinematics.bpm);
  const velocity = kinematics.velocityMs;
  const wrist = kinematics.wristVelocityMs;
  const mainMetric =
    sport === "strength"
      ? { label: "VBT", value: velocity.toFixed(2), unit: "м/с", glow: "cyan" as const }
      : {
          label: sport === "boxing" ? "Удар" : "Замах",
          value: (lastStrikeSpeed ?? wrist).toFixed(2),
          unit: "м/с",
          glow: "orange" as const,
        };

  const subLeft =
    sport === "strength"
      ? { label: "Повторы", value: String(reps) }
      : { label: "BPM", value: String(bpm) };

  const subRight = { label: "Техника", value: `${formScore}%` };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      {/* Vignette — гасим лишнее */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />

      <AnimatePresence>
        {strikeFlash && sport !== "strength" && (
          <motion.div
            key="flash"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-36 left-1/2 z-40 -translate-x-1/2"
          >
            <p
              className={`text-metric-xl focus-hud-glow-orange text-center ${
                sport === "boxing" ? "focus-hud-glow-orange" : "focus-hud-glow-cyan"
              }`}
            >
              {mainMetric.value}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="focus-hud-bar relative px-4 pb-6 pt-10">
        {/* Timer — минимальный */}
        <p className="absolute top-2 right-4 font-mono text-sm tabular-nums text-muted">
          {formatTime(elapsedSec)}
        </p>

        {/* Sport tag */}
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
          {sport === "strength"
            ? exercise
              ? exerciseLabel(exercise)
              : "Силовые"
            : sport === "boxing"
              ? "Бокс"
              : "Теннис"}
          {strikeLabel ? ` · ${strikeLabel}` : ""}
        </p>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-[72px]">
            <p className="text-[9px] uppercase tracking-wider text-muted">
              {subLeft.label}
            </p>
            <p className="text-metric-lg text-foreground">{subLeft.value}</p>
          </div>

          <div className="flex-1 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted">
              {mainMetric.label}
            </p>
            <p
              className={`text-metric-xl ${
                mainMetric.glow === "cyan"
                  ? "focus-hud-glow-cyan"
                  : "focus-hud-glow-orange"
              }`}
            >
              {mainMetric.value}
            </p>
            <p className="text-sm text-muted">{mainMetric.unit}</p>
          </div>

          <div className="min-w-[72px] text-right">
            <p className="text-[9px] uppercase tracking-wider text-muted">
              {subRight.label}
            </p>
            <p
              className={`text-metric-lg ${
                formScore >= 70 ? "text-success" : "text-[var(--neon-orange)]"
              }`}
            >
              {subRight.value}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
