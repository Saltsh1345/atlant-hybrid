"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SportPicker from "@/components/training/SportPicker";
import { useAppStore } from "@/store/useAppStore";
import type { Sport, StrengthExercise } from "@/types";

export default function WelcomeScreen() {
  const setPhase = useAppStore((s) => s.setPhase);
  const profile = useAppStore((s) => s.profile);
  const ensureProfile = useAppStore((s) => s.ensureProfile);
  const setSelectedSport = useAppStore((s) => s.setSelectedSport);
  const setSelectedExercise = useAppStore((s) => s.setSelectedExercise);
  const startSession = useAppStore((s) => s.startSession);

  const startTraining = (sport: Sport, exercise?: StrengthExercise) => {
    ensureProfile();
    setSelectedSport(sport);
    setSelectedExercise(exercise ?? null);
    startSession();
    setPhase("training");
  };

  return (
    <motion.div
      className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-sky-100">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 4 L36 34 H4 Z"
              stroke="#0ea5e9"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="20" cy="24" r="4" fill="#10b981" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Atlant-Hybrid
        </h1>
        <p className="mt-1 text-sm text-muted">
          VBT через камеру · ИИ-анализ · бокс · теннис · силовые
        </p>
      </div>

      <Card className="mb-4 !border-cyan-200/80 !bg-gradient-to-b from-white to-cyan-50/40">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-700">
          Быстрый старт
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Выберите тренировку
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Скан тела не обязателен — камера сразу анализирует движения и удары
        </p>
        <SportPicker compact onSelect={startTraining} />
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            ensureProfile();
            setPhase("calibration");
          }}
        >
          Скан тела
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="!bg-white"
          onClick={() => setPhase(profile ? "dashboard" : "registration")}
        >
          {profile ? "Дашборд" : "Профиль"}
        </Button>
      </div>

      <p className="mt-4 text-center text-[10px] text-slate-400">
        Состав тела — опционально. Тренировка и Gemini-анализ доступны сразу.
      </p>
    </motion.div>
  );
}
