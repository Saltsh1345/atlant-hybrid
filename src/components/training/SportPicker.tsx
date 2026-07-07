"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import type { Sport, StrengthExercise } from "@/types";

export const SPORTS: {
  id: Sport;
  title: string;
  desc: string;
  emoji: string;
}[] = [
  {
    id: "boxing",
    title: "Бокс",
    desc: "Удары · скорость · точность",
    emoji: "🥊",
  },
  {
    id: "tennis",
    title: "Теннис",
    desc: "Замах · прогиб · VBT",
    emoji: "🎾",
  },
  {
    id: "strength",
    title: "Силовые",
    desc: "Присед · жим · выпады",
    emoji: "🏋️",
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

export default function SportPicker({
  onSelect,
  compact,
}: {
  onSelect: (sport: Sport, exercise?: StrengthExercise) => void;
  compact?: boolean;
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
    <AnimatePresence mode="wait">
      {!pickingExercise ? (
        <motion.div
          key="sports"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className={compact ? "space-y-2" : "space-y-3"}
        >
          {SPORTS.map((s, i) => (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => selectSport(s.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.15 }}
              className="relative z-10 w-full cursor-pointer text-left"
            >
              <Card
                className={`flex items-center gap-3 transition hover:ring-2 hover:ring-[var(--primary)]/30 ${compact ? "!py-3" : ""}`}
              >
                <span className={compact ? "text-2xl" : "text-3xl"}>{s.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-sm text-muted">{s.desc}</p>
                </div>
              </Card>
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key="exercises"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type="button"
            onClick={() => setPickingExercise(false)}
            className="mb-3 text-sm font-medium text-primary"
          >
            ← Назад к спортам
          </button>
          <div className="space-y-2">
            {EXERCISES.map((ex, i) => (
              <motion.button
                key={ex.id}
                type="button"
                onClick={() => onSelect("strength", ex.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.15 }}
                className="relative z-10 w-full cursor-pointer text-left"
              >
                <Card className="transition hover:ring-2 hover:ring-[var(--accent)]/30">
                  <p className="font-semibold text-foreground">{ex.title}</p>
                  <p className="text-sm text-muted">{ex.desc}</p>
                </Card>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
