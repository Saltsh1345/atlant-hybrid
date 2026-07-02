import type { FitnessGoal, Sport, StrengthExercise } from "@/types";
import type { ReadinessReport } from "@/lib/readiness";

export interface WorkoutPlan {
  title: string;
  focus: string;
  durationMin: number;
  tips: string[];
}

export function generateWorkoutPlan(opts: {
  goal: FitnessGoal;
  readiness: ReadinessReport;
  lastSport?: Sport | null;
  lastExercise?: StrengthExercise | null;
}): WorkoutPlan {
  const { goal, readiness, lastSport, lastExercise } = opts;
  const low = readiness.overall < 60;

  if (goal === "lose_weight" || goal === "performance") {
    return {
      title: low ? "Кардио + техника" : "Интервальная силовая",
      focus: lastSport === "boxing" ? "boxing" : "strength",
      durationMin: low ? 20 : 35,
      tips: low
        ? [
            "Бокс или теннис — средний темп",
            "Контроль техники важнее скорости",
            "Пауза 60 сек между раундами",
          ]
        : [
            "Силовые: присед или выпады 3×12",
            "VBT-контроль скорости штанги/тела",
            "Завершить 5 мин растяжки",
          ],
    };
  }

  if (goal === "gain_muscle") {
    const ex =
      lastExercise === "bench"
        ? "жим"
        : lastExercise === "lunge"
          ? "выпады"
          : "присед";
    return {
      title: low ? `Лёгкий ${ex}` : `Тяжёлый ${ex} + объём`,
      focus: "strength",
      durationMin: low ? 25 : 45,
      tips: low
        ? [
            `${ex.charAt(0).toUpperCase() + ex.slice(1)} — 3×8, медленный темп`,
            "Глубина/амплитуда под контролем камеры",
            "Отдых 90 сек",
          ]
        : [
            `${ex.charAt(0).toUpperCase() + ex.slice(1)} — 4×6, VBT-скорость`,
            "Цель: техника > 80%",
            "Добавить 2 подхода добивающие",
          ],
    };
  }

  return {
    title: "Сбалансированная сессия",
    focus: lastSport ?? "strength",
    durationMin: 30,
    tips: [
      "Разминка 5 мин перед камерой",
      "Чередуйте силовые и координацию",
      "Запишите оценку техники после сессии",
    ],
  };
}
