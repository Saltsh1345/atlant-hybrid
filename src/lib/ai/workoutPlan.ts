import type { FitnessGoal, Sport, StrengthExercise } from "@/types";
import type { ReadinessReport } from "@/lib/readiness";
import type { TrainingProgram } from "@/types/training";
import {
  exerciseById,
  exercisesBySport,
  CATEGORY_LABELS,
} from "@/lib/training/exerciseCatalog";
import {
  formatSetPlan,
  getTodayTrainingDay,
} from "@/lib/training/programEngine";

export interface WorkoutPlan {
  title: string;
  focus: string;
  durationMin: number;
  tips: string[];
  exerciseIds?: string[];
}

export function generateWorkoutPlan(opts: {
  goal: FitnessGoal;
  readiness: ReadinessReport;
  lastSport?: Sport | null;
  lastExercise?: StrengthExercise | null;
  trainingProgram?: TrainingProgram | null;
  preferredSport?: Sport | null;
}): WorkoutPlan {
  const {
    goal,
    readiness,
    lastSport,
    lastExercise,
    trainingProgram,
    preferredSport,
  } = opts;
  const low = readiness.overall < 60;

  const today = trainingProgram ? getTodayTrainingDay(trainingProgram) : null;
  if (today && !today.restDay && today.blocks.length > 0) {
    const focusSport = today.blocks[0]?.sport ?? "strength";
    const tips = today.blocks.slice(0, 3).map((b) => {
      const ex = exerciseById(b.exerciseId);
      const cat = b.category ? CATEGORY_LABELS[b.category] : "";
      const hint = ex?.hints?.[0];
      return hint
        ? `${b.name}: ${hint}`
        : `${b.name}${cat ? ` · ${cat}` : ""} — ${formatSetPlan(b.sets)}`;
    });
    return {
      title: trainingProgram?.title ?? "План на сегодня",
      focus: focusSport,
      durationMin: today.estimatedMin || (low ? 25 : 40),
      tips,
      exerciseIds: today.blocks.map((b) => b.exerciseId),
    };
  }

  const sport =
    preferredSport ??
    lastSport ??
    (goal === "gain_muscle" ? "strength" : "boxing");

  if (goal === "lose_weight" || goal === "performance") {
    const drills = exercisesBySport(
      sport === "strength" ? "boxing" : sport
    ).slice(0, 2);
    return {
      title: low ? "Кардио + техника" : "Интервальная силовая",
      focus: sport === "strength" ? "boxing" : sport,
      durationMin: low ? 20 : 35,
      tips: low
        ? drills.map((d) => d.name).concat(["Контроль техники важнее скорости"])
        : [
            drills[0]?.name ?? "Силовые: присед или выпады 3×12",
            drills[1]?.name ?? "VBT-контроль скорости",
            "Завершить 5 мин растяжки",
          ],
      exerciseIds: drills.map((d) => d.id),
    };
  }

  if (goal === "gain_muscle") {
    const ex =
      lastExercise === "bench"
        ? exerciseById("bench")
        : lastExercise === "lunge"
          ? exerciseById("lunge")
          : exerciseById("squat");
    const companions = exercisesBySport("strength")
      .filter((e) => e.category === "hypertrophy" && e.id !== ex?.id)
      .slice(0, 2);
    return {
      title: low ? `Лёгкий ${ex?.name ?? "присед"}` : `Тяжёлый ${ex?.name ?? "присед"} + объём`,
      focus: "strength",
      durationMin: low ? 25 : 45,
      tips: low
        ? [
            `${ex?.name ?? "Присед"} — 3×8, медленный темп`,
            companions[0]?.name
              ? `Добавить: ${companions[0].name}`
              : "Глубина/амплитуда под контролем камеры",
            "Отдых 90 сек",
          ]
        : [
            `${ex?.name ?? "Присед"} — 4×6, VBT-скорость`,
            companions[0]?.name
              ? `Добавить: ${companions[0].name}`
              : "Цель: техника > 80%",
            companions[1]?.name
              ? `Финиш: ${companions[1].name}`
              : "Добавить 2 подхода добивающие",
          ],
      exerciseIds: [ex?.id, companions[0]?.id, companions[1]?.id].filter(
        Boolean
      ) as string[],
    };
  }

  return {
    title: "Сбалансированная сессия",
    focus: sport,
    durationMin: 30,
    tips: exercisesBySport(sport)
      .slice(0, 3)
      .map((e) => e.name)
      .concat(["Запишите оценку техники после сессии"])
      .slice(0, 3),
    exerciseIds: exercisesBySport(sport).slice(0, 3).map((e) => e.id),
  };
}
