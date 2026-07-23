"use client";

import type { DailyPlan } from "@/lib/plan/types";

const FOCUS_LABELS: Record<string, string> = {
  strength: "Силовая",
  boxing: "Бокс",
  tennis: "Теннис",
};

export interface TodayExerciseCardsProps {
  plan: DailyPlan | null;
  generating: boolean;
  onGenerate: () => void;
}

export default function TodayExerciseCards({
  plan,
  generating,
  onGenerate,
}: TodayExerciseCardsProps) {
  if (!plan) {
    return (
      <div className="rounded-2xl border border-cyan-300/15 bg-[#060b13] p-5 text-center">
        <p className="text-sm text-zinc-400">
          На этот день плана ещё нет.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-4 w-full rounded-2xl border border-cyan-200/50 bg-cyan-300 px-6 py-3 text-sm font-bold tracking-[0.08em] text-black shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "ГЕНЕРАЦИЯ ПЛАНА..." : "СГЕНЕРИРОВАТЬ ПЛАН"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-[#060b13] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-cyan-100">{plan.title}</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {FOCUS_LABELS[plan.focus] ?? plan.focus} · ~{plan.durationMin} мин ·{" "}
            {plan.source === "gemini" ? "план Gemini" : "локальный план"}
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="shrink-0 rounded-lg border border-cyan-300/25 px-3 py-1.5 text-[0.65rem] font-semibold tracking-wider text-cyan-200 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "..." : "ОБНОВИТЬ"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {plan.exercises.map((exercise) => (
          <div
            key={exercise.exerciseId}
            className="rounded-xl border border-white/8 bg-black/30 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-100">
                {exercise.name}
              </span>
              <span className="text-xs font-mono text-cyan-200">
                {exercise.sets}×{exercise.reps}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.65rem] text-zinc-500">
              <span>отдых {exercise.restSec} с</span>
              {exercise.equipment && <span>{exercise.equipment}</span>}
            </div>
            {exercise.hint && (
              <p className="mt-1.5 text-xs text-zinc-400">{exercise.hint}</p>
            )}
          </div>
        ))}
      </div>

      {plan.tips.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {plan.tips.map((tip) => (
            <li key={tip} className="flex gap-2 text-xs text-zinc-400">
              <span className="text-cyan-300">◆</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
