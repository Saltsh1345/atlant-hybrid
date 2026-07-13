"use client";

import type { TrainingProgram } from "@/types/training";
import type { ExerciseLog } from "@/types/training";
import {
  getTodayTrainingDay,
  formatSetPlan,
} from "@/lib/training/programEngine";
import { CATEGORY_LABELS } from "@/lib/training/exerciseCatalog";
import { totalSetsInHistory } from "@/lib/training/sessionLog";
import Button from "@/components/ui/Button";

export default function TrainingProgramPanel({
  program,
  exerciseLogs,
  onStartToday,
}: {
  program: TrainingProgram | null;
  exerciseLogs: ExerciseLog[];
  onStartToday?: () => void;
}) {
  const today = program ? getTodayTrainingDay(program) : null;
  const totalSets = totalSetsInHistory(exerciseLogs);

  if (!program) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
          План тренировок
        </p>
        <p className="mt-2 text-sm text-[#a3a3a3]">
          После биоскана и диагностики здесь появится программа на 7 дней: упражнения,
          подходы, повторения и отдых между подходами.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--neon-lime,#ccff00)]/20 bg-[#141414] p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--neon-lime,#ccff00)]">
            План · 7 дней
          </p>
          <p className="mt-1 text-lg font-bold text-white">{program.title}</p>
        </div>
        <p className="font-mono text-[10px] text-[#737373]">
          история: {totalSets} подходов
        </p>
      </div>

      {today && (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-[10px] uppercase text-[#a3a3a3]">
            Сегодня · {today.label}
            {today.restDay ? " · отдых" : ` · ~${today.estimatedMin} мин`}
          </p>
          {today.restDay ? (
            <p className="mt-2 text-sm text-[#a3a3a3]">
              Восстановление. Лёгкая прогулка или растяжка.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {today.blocks.map((b) => (
                <div key={b.exerciseId}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{b.name}</p>
                    {b.category && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wide text-[#a3a3a3]">
                        {CATEGORY_LABELS[b.category]}
                      </span>
                    )}
                    {b.trackingMode === "pose" && (
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] uppercase text-cyan-300/80">
                        камера
                      </span>
                    )}
                  </div>
                  {b.equipment && (
                    <p className="text-[10px] text-[#737373]">{b.equipment}</p>
                  )}
                  <p className="font-mono text-[11px] text-cyan-300/90">
                    {formatSetPlan(b.sets)}
                  </p>
                  {b.notes && (
                    <p className="text-[10px] text-amber-200/70">{b.notes}</p>
                  )}
                </div>
              ))}
              {onStartToday && (
                <Button size="md" className="!w-full" onClick={onStartToday}>
                  Начать тренировку дня
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <details className="text-xs text-[#a3a3a3]">
        <summary className="cursor-pointer text-[#737373]">Вся неделя</summary>
        <ul className="mt-2 space-y-2">
          {program.weeks[0]?.days.map((d) => (
            <li key={d.dayIndex} className="border-t border-white/5 pt-2">
              <span className="text-white">{d.label}</span>
              {d.restDay ? (
                <span className="ml-2 text-[#737373]">отдых</span>
              ) : (
                <span className="ml-2">
                  {d.blocks
                    .map((b) =>
                      b.category
                        ? `${b.name} (${CATEGORY_LABELS[b.category]})`
                        : b.name
                    )
                    .join(" + ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
