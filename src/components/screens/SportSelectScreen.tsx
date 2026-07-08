"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import ApexSportSelect from "@/components/dashboard/ApexSportSelect";
import { goToTraining } from "@/lib/navigation/goToTraining";
import type { Sport, StrengthExercise } from "@/types";

/** Выбор спорта — Бокс / Теннис / Силовые */
export default function SportSelectScreen() {
  const setPhase = useAppStore((s) => s.setPhase);
  const setFocusSportPicker = useDashboardLayoutStore(
    (s) => s.setFocusSportPicker
  );

  useEffect(() => {
    useAppStore.getState().ensureProfile();
  }, []);

  const onSelect = (sport: Sport, exercise?: StrengthExercise) => {
    setFocusSportPicker(false);
    void goToTraining(sport, exercise);
  };

  return (
    <div className="min-h-dvh bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => setPhase("dashboard")}
          className="mb-6 text-sm text-[var(--neon-lime,#ccff00)]"
        >
          ← Назад к обзору
        </button>
        <ApexSportSelect onSelect={onSelect} highlight />
      </div>
    </div>
  );
}
