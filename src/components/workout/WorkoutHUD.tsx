"use client";

import type { WorkoutMetrics, WorkoutPhase } from "@/lib/workout/types";

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function WorkoutHUD({
  phase,
  elapsedSec,
  metrics,
  bodyWeightKg,
  loadWeightKg,
  exerciseName,
  setLabel,
  lastGesture,
}: {
  phase: WorkoutPhase;
  elapsedSec: number;
  metrics: WorkoutMetrics;
  bodyWeightKg: number | null;
  loadWeightKg: number | null;
  exerciseName?: string;
  setLabel?: string;
  lastGesture: string | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/90 to-transparent px-4 pb-14 pt-4 text-cyan-100">
      <div className="mx-auto flex max-w-xl items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.28em] text-cyan-300/75">
            ATLANT://LIVE-SCANNER
          </p>
          {exerciseName && (
            <p className="mt-1 text-sm font-semibold text-cyan-50">{exerciseName}</p>
          )}
          {setLabel && (
            <p className="text-[0.65rem] text-zinc-400">{setLabel}</p>
          )}
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatTime(elapsedSec)}</p>
          <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-zinc-400">
            {phase === "ready"
              ? "Введите вес и начните подход"
              : phase === "paused"
                ? "Пауза"
                : phase === "running"
                  ? "Подход идёт"
                  : "Сессия завершена"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <Metric label="VBT" value={`${metrics.verticalVelocityMs.toFixed(2)} м/с`} />
          <Metric
            label="СНАРЯД"
            value={loadWeightKg != null ? `${loadWeightKg} кг` : "—"}
          />
          <Metric label="ПОВТОРЫ" value={String(metrics.repetitions)} />
          <Metric
            label="ТЕЛО"
            value={bodyWeightKg ? `${bodyWeightKg} кг` : "—"}
          />
        </div>
      </div>
      {lastGesture && (
        <p className="mx-auto mt-3 max-w-xl text-[0.65rem] text-emerald-300">
          Жест: {lastGesture}
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-cyan-300/20 bg-black/45 px-2 py-1.5">
      <p className="text-[0.55rem] tracking-wider text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 text-xs font-semibold ${danger ? "text-rose-300" : "text-cyan-100"}`}
      >
        {value}
      </p>
    </div>
  );
}
