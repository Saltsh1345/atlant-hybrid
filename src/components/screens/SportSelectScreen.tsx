"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";
import { speak } from "@/lib/ai/speech";
import type { Sport, StrengthExercise } from "@/types";

const SPORTS: { id: Sport; title: string; desc: string; emoji: string }[] = [
  {
    id: "strength",
    title: "Силовые",
    desc: "Присед · Жим · Выпады",
    emoji: "🏋️",
  },
  {
    id: "boxing",
    title: "Бокс",
    desc: "Джеб-кросс · VBT запястья",
    emoji: "🥊",
  },
  {
    id: "tennis",
    title: "Большой теннис",
    desc: "Замах · Прогиб спины",
    emoji: "🎾",
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

export default function SportSelectScreen() {
  const setSelectedSport = useAppStore((s) => s.setSelectedSport);
  const setSelectedExercise = useAppStore((s) => s.setSelectedExercise);
  const setPhase = useAppStore((s) => s.setPhase);
  const startSession = useAppStore((s) => s.startSession);
  const [pickingExercise, setPickingExercise] = useState(false);

  useEffect(() => {
    speak(
      "Выберите, каким спортом будем заниматься: Силовые, Бокс, Большой теннис."
    );
  }, []);

  const selectSport = (sport: Sport) => {
    setSelectedSport(sport);
    if (sport === "strength") {
      setPickingExercise(true);
      speak("Выберите упражнение: присед, жим или выпады.");
      return;
    }
    startSession();
    setPhase("training");
  };

  const selectExercise = (exercise: StrengthExercise) => {
    setSelectedExercise(exercise);
    startSession();
    setPhase("training");
  };

  return (
    <motion.div
      className="mx-auto min-h-dvh max-w-lg px-5 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AnimatePresence mode="wait">
        {!pickingExercise ? (
          <motion.div
            key="sports"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="mb-2 text-2xl font-bold">Выбор спорта</h2>
            <p className="mb-8 text-sm text-muted">
              ИИ подберёт биомеханику под выбранную дисциплину
            </p>
            <div className="space-y-4">
              {SPORTS.map((s, i) => (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => selectSport(s.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="w-full text-left"
                >
                  <Card className="flex items-center gap-4 transition hover:shadow-lg hover:ring-2 hover:ring-sky-100">
                    <span className="text-3xl">{s.emoji}</span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-muted">{s.desc}</p>
                    </div>
                  </Card>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <button
              type="button"
              onClick={() => setPickingExercise(false)}
              className="mb-4 text-sm text-primary"
            >
              ← Назад к спортам
            </button>
            <h2 className="mb-2 text-2xl font-bold">Упражнение</h2>
            <p className="mb-8 text-sm text-muted">
              Силовая тренировка — выберите движение
            </p>
            <div className="space-y-4">
              {EXERCISES.map((ex, i) => (
                <motion.button
                  key={ex.id}
                  type="button"
                  onClick={() => selectExercise(ex.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="w-full text-left"
                >
                  <Card className="transition hover:shadow-lg hover:ring-2 hover:ring-emerald-100">
                    <p className="font-semibold">{ex.title}</p>
                    <p className="text-sm text-muted">{ex.desc}</p>
                  </Card>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
