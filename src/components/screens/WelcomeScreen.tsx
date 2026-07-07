"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SportPicker from "@/components/training/SportPicker";
import { useAppStore } from "@/store/useAppStore";
import { goToTraining } from "@/lib/navigation/goToTraining";
import type { Sport, StrengthExercise } from "@/types";

export default function WelcomeScreen() {
  const setPhase = useAppStore((s) => s.setPhase);
  const profile = useAppStore((s) => s.profile);
  const ensureProfile = useAppStore((s) => s.ensureProfile);

  const startTraining = (sport: Sport, exercise?: StrengthExercise) => {
    void goToTraining(sport, exercise);
  };

  return (
    <motion.div
      className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background px-5 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-muted)]">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 4 L36 34 H4 Z"
              stroke="var(--primary)"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="20" cy="24" r="4" fill="var(--accent)" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Atlant-Hybrid
        </h1>
        <p className="mt-1 text-sm text-muted">
          VBT через камеру · ИИ-анализ · бокс · теннис · силовые
        </p>
      </div>

      <Card className="mb-4 border-[var(--primary)]/20 bg-gradient-to-b from-[var(--surface)] to-[var(--primary-muted)]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
          Быстрый старт
        </p>
        <h2 className="mt-1 text-lg font-bold text-foreground">
          Выберите тренировку
        </h2>
        <p className="mb-4 text-xs text-muted">
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
          onClick={() => setPhase(profile ? "dashboard" : "registration")}
        >
          {profile ? "Дашборд" : "Профиль"}
        </Button>
      </div>

      <p className="mt-4 text-center text-[10px] text-muted">
        Состав тела — опционально. Тренировка и Gemini-анализ доступны сразу.
      </p>
    </motion.div>
  );
}
