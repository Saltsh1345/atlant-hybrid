"use client";

export interface AnalyticsSummaryCardProps {
  summary: string | null;
  source: "gemini" | "fallback" | null;
  summarizing: boolean;
  tonnageKg: number | null;
  caloriesEst: number | null;
  onGenerate: () => void;
  disabled?: boolean;
}

export default function AnalyticsSummaryCard({
  summary,
  source,
  summarizing,
  tonnageKg,
  caloriesEst,
  onGenerate,
  disabled,
}: AnalyticsSummaryCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Резюме Gemini
          </p>
          <p className="mt-1 text-[0.65rem] text-zinc-600">
            Рекомендация по результатам сессии. Не медицинский диагноз.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || summarizing}
          className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-xs font-semibold tracking-wider text-cyan-100 disabled:opacity-50"
        >
          {summarizing
            ? "ГЕНЕРАЦИЯ..."
            : summary
              ? "ОБНОВИТЬ РЕЗЮМЕ"
              : "СФОРМИРОВАТЬ РЕЗЮМЕ"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
          <p className="text-[0.6rem] uppercase tracking-wider text-zinc-500">
            Тоннаж (оценка)
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">
            {tonnageKg != null ? `${tonnageKg} кг` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
          <p className="text-[0.6rem] uppercase tracking-wider text-zinc-500">
            Ккал (локально)
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">
            {caloriesEst != null ? caloriesEst : "—"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[0.6rem] text-zinc-600">
        Калории считаются локально и не отправляются в Health API на этом этапе.
      </p>

      {summary ? (
        <div className="mt-4">
          {source && (
            <p className="mb-2 text-[0.6rem] uppercase tracking-wider text-zinc-500">
              Источник: {source === "gemini" ? "Gemini" : "локальный fallback"}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">
            {summary}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          Нажмите кнопку, чтобы получить текстовый разбор сессии.
        </p>
      )}
    </section>
  );
}
