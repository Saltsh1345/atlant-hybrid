"use client";

import type { PlanExercise } from "@/lib/plan/types";

export default function WorkoutSetPanel({
  exercise,
  setIndex,
  totalSets,
  loadWeightKg,
  setPhase,
  onWeightChange,
  onStartSet,
  onCompleteSet,
  onSkipRest,
  saving,
}: {
  exercise: PlanExercise;
  setIndex: number;
  totalSets: number;
  loadWeightKg: number | null;
  setPhase: "awaiting_weight" | "performing" | "rest" | "loading" | "done";
  onWeightChange: (kg: number | null) => void;
  onStartSet: () => void;
  onCompleteSet: () => void;
  onSkipRest: () => void;
  saving?: boolean;
}) {
  if (setPhase === "loading" || setPhase === "done") return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-28 z-30 mx-auto max-w-sm px-4">
      <div className="rounded-2xl border border-cyan-300/25 bg-black/85 p-4 backdrop-blur-sm">
        <p className="text-[0.65rem] uppercase tracking-wider text-zinc-500">
          {exercise.name} · подход {setIndex + 1}/{totalSets}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Цель: {exercise.reps} повт. · отдых {exercise.restSec} с
        </p>

        {setPhase === "awaiting_weight" && (
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-zinc-300">
              Вес снаряда (кг)
              <input
                type="number"
                min={0}
                max={500}
                step={0.5}
                value={loadWeightKg ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onWeightChange(v === "" ? null : Number(v));
                }}
                placeholder="0 = без отягощения"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-300/50"
              />
            </label>
            <button
              type="button"
              onClick={onStartSet}
              className="w-full rounded-xl border border-cyan-200/50 bg-cyan-300 px-4 py-3 text-sm font-bold tracking-wider text-black"
            >
              НАЧАТЬ ПОДХОД
            </button>
          </div>
        )}

        {setPhase === "performing" && (
          <button
            type="button"
            onClick={onCompleteSet}
            disabled={saving}
            className="mt-3 w-full rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-4 py-3 text-sm font-bold tracking-wider text-emerald-100 disabled:opacity-50"
          >
            {saving ? "СОХРАНЕНИЕ…" : "ЗАВЕРШИТЬ ПОДХОД"}
          </button>
        )}

        {setPhase === "rest" && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-amber-200">Отдых между подходами</p>
            <button
              type="button"
              onClick={onSkipRest}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100"
            >
              СЛЕДУЮЩИЙ ПОДХОД
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
