"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppIcon, { type AppIconName } from "@/components/ui/AppIcon";
import type { Sport, StrengthExercise } from "@/types";

const SPORTS: {
  id: Sport;
  title: string;
  desc: string;
  icon: AppIconName;
}[] = [
  {
    id: "boxing",
    title: "Бокс",
    desc: "Удары · скорость · точность",
    icon: "boxing",
  },
  {
    id: "tennis",
    title: "Теннис",
    desc: "Замах · прогиб · VBT",
    icon: "tennis",
  },
  {
    id: "strength",
    title: "Силовые",
    desc: "Присед · жим · выпады",
    icon: "strength",
  },
];

const EXERCISES: {
  id: StrengthExercise;
  title: string;
  desc: string;
}[] = [
  { id: "squat", title: "Присед", desc: "Угол колена · глубина" },
  { id: "bench", title: "Жим", desc: "Угол локтя · амплитуда" },
  { id: "lunge", title: "Выпады", desc: "Переднее колено · баланс" },
];

export default function ApexSportSelect({
  onSelect,
  highlight,
}: {
  onSelect: (sport: Sport, exercise?: StrengthExercise) => void;
  highlight?: boolean;
}) {
  const [pickingExercise, setPickingExercise] = useState(false);

  const selectSport = (sport: Sport) => {
    if (sport === "strength") {
      setPickingExercise(true);
      return;
    }
    onSelect(sport);
  };

  return (
    <section
      id="dashboard-sport-picker"
      className={`rounded-2xl border border-white/8 bg-[#141414] p-5 ${
        highlight ? "ring-2 ring-[var(--neon-lime,#ccff00)]/50" : ""
      }`}
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
            Старт
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {pickingExercise ? "Выберите упражнение" : "Выберите вид спорта"}
          </h2>
        </div>
        {!pickingExercise && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">
            Бокс · Теннис · Зал
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!pickingExercise ? (
          <motion.div
            key="sports"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="grid gap-3 sm:grid-cols-3"
          >
            {SPORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSport(s.id)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-[var(--neon-lime,#ccff00)]/40 hover:bg-[var(--primary-muted)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-[var(--neon-lime,#ccff00)] transition group-hover:border-[var(--neon-lime,#ccff00)]/50">
                  <AppIcon name={s.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-white">{s.title}</p>
                  <p className="mt-0.5 text-xs text-[#a3a3a3]">{s.desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <button
              type="button"
              onClick={() => setPickingExercise(false)}
              className="mb-3 text-sm font-medium text-[var(--neon-lime,#ccff00)]"
            >
              ← Назад к видам спорта
            </button>
            <div className="grid gap-3 sm:grid-cols-3">
              {EXERCISES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onSelect("strength", ex.id)}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-[var(--neon-lime,#ccff00)]/40 hover:bg-[var(--primary-muted)]"
                >
                  <p className="text-base font-semibold text-white">{ex.title}</p>
                  <p className="mt-0.5 text-xs text-[#a3a3a3]">{ex.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
