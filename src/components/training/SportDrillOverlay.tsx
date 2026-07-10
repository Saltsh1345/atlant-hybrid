"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { DrillCommand, DrillPhase } from "@/lib/training/drillProtocol";

const AUTO_ANALYSIS_SEC = 3;

export default function SportDrillOverlay({
  phase,
  command,
  commandIndex,
  totalCommands,
  countdown,
  activeSecLeft,
  fixationText,
  fixedCount,
  autoAnalyzeSec,
}: {
  phase: DrillPhase;
  command: DrillCommand | null;
  commandIndex: number;
  totalCommands: number;
  countdown: number;
  activeSecLeft: number;
  fixationText: string;
  fixedCount: number;
  /** Seconds until analysis opens automatically (hands-free). */
  autoAnalyzeSec?: number | null;
}) {
  if (phase === "complete") {
    return (
      <div className="absolute inset-x-4 top-[20%] z-40 text-center">
        <div className="atlant-edge-hud mx-auto max-w-sm px-5 py-6">
          <p className="text-lg font-bold text-emerald-600">Серия завершена</p>
          <p className="mt-2 text-sm text-slate-600">
            Зафиксировано ударов: {fixedCount} / {totalCommands}
          </p>
          {autoAnalyzeSec != null && autoAnalyzeSec > 0 ? (
            <p className="mt-4 text-4xl font-black text-cyan-600">{autoAnalyzeSec}</p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-slate-700">
            {autoAnalyzeSec != null && autoAnalyzeSec > 0
              ? "Анализ откроется автоматически"
              : "Открываю анализ…"}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "idle") return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${commandIndex}-${phase}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute inset-x-4 top-[18%] z-40 flex flex-col items-center gap-3"
      >
        <div className="atlant-hud-pill">
          Команда {commandIndex + 1}/{totalCommands} · зафиксировано {fixedCount}
        </div>

        {command && (
          <div className="atlant-edge-hud w-full max-w-sm px-5 py-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-cyan-700">
              {phase === "instruction" && "Слушайте команду"}
              {phase === "countdown" && "Приготовьтесь"}
              {phase === "active" && "⚡ Выполняйте удар"}
              {phase === "fixation" && "✓ Фиксация"}
              {phase === "rest" && "Отдых"}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{command.text}</p>
            {phase === "instruction" && (
              <p className="mt-2 text-xs text-slate-500">
                Сейчас начнётся отсчёт — затем бейте в камеру
              </p>
            )}
            {phase === "countdown" && (
              <p className="mt-2 text-5xl font-black text-orange-500">{countdown}</p>
            )}
            {phase === "active" && (
              <>
                <p className="mt-2 font-mono text-3xl font-bold text-cyan-600">
                  {activeSecLeft}с
                </p>
                <p className="mt-1 text-xs text-orange-600">
                  Резкий удар по команде — мах рукой не засчитывается
                </p>
              </>
            )}
            {fixationText && (
              <p
                className={`mt-2 text-sm font-semibold ${
                  fixationText.includes("Размах") ||
                  fixationText.includes("Не ") ||
                  fixationText.includes("не похож") ||
                  fixationText.includes("не засчитан") ||
                  fixationText.includes("Слишком")
                    ? "text-warning"
                    : "text-emerald-600"
                }`}
              >
                {fixationText}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
