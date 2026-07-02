"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import SportPicker from "@/components/training/SportPicker";
import { useAppStore } from "@/store/useAppStore";
import { speak } from "@/lib/ai/speech";
import type { Sport, StrengthExercise } from "@/types";

export default function SportSelectScreen() {
  const setSelectedSport = useAppStore((s) => s.setSelectedSport);
  const setSelectedExercise = useAppStore((s) => s.setSelectedExercise);
  const setPhase = useAppStore((s) => s.setPhase);
  const startSession = useAppStore((s) => s.startSession);
  const ensureProfile = useAppStore((s) => s.ensureProfile);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);

  useEffect(() => {
    speak("Выберите спорт: бокс, теннис или силовые.");
  }, []);

  const startTraining = (sport: Sport, exercise?: StrengthExercise) => {
    ensureProfile();
    setSelectedSport(sport);
    if (exercise) setSelectedExercise(exercise);
    startSession();
    setPhase("training");
  };

  return (
    <motion.div
      className="mx-auto min-h-dvh max-w-lg px-5 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        type="button"
        onClick={() => setPhase("welcome")}
        className="mb-4 text-sm font-medium text-cyan-700"
      >
        ← На главную
      </button>
      <h2 className="mb-2 text-2xl font-bold">Выбор тренировки</h2>
      <p className="mb-6 text-sm text-muted">
        Камера зафиксирует скорость и технику. Скан тела{" "}
        {bodyDataLocked ? "уже пройден" : "не обязателен"}.
      </p>
      <SportPicker onSelect={startTraining} />
    </motion.div>
  );
}
