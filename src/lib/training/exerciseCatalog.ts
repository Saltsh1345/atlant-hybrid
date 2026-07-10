import type { Sport, StrengthExercise } from "@/types";

export interface ExerciseDef {
  id: string;
  name: string;
  sport: Sport;
  strengthExercise?: StrengthExercise;
  primaryMuscles: string[];
  muscleGroups: string[];
  defaultSets: { reps: number; restSec: number }[];
  vbtTargetMs?: number;
}

export const EXERCISE_CATALOG: ExerciseDef[] = [
  {
    id: "squat",
    name: "Присед",
    sport: "strength",
    strengthExercise: "squat",
    primaryMuscles: [
      "quadriceps_l",
      "quadriceps_r",
      "glutes_c",
      "hamstrings_l",
      "hamstrings_r",
    ],
    muscleGroups: ["Ноги", "Спина", "Кор"],
    defaultSets: [
      { reps: 8, restSec: 90 },
      { reps: 8, restSec: 90 },
      { reps: 6, restSec: 120 },
    ],
    vbtTargetMs: 0.45,
  },
  {
    id: "bench",
    name: "Жим",
    sport: "strength",
    strengthExercise: "bench",
    primaryMuscles: ["chest_l", "chest_r", "shoulders_l", "triceps_l", "triceps_r"],
    muscleGroups: ["Грудь", "Плечи"],
    defaultSets: [
      { reps: 10, restSec: 75 },
      { reps: 8, restSec: 90 },
      { reps: 8, restSec: 90 },
    ],
    vbtTargetMs: 0.35,
  },
  {
    id: "lunge",
    name: "Выпады",
    sport: "strength",
    strengthExercise: "lunge",
    primaryMuscles: [
      "quadriceps_l",
      "quadriceps_r",
      "glutes_l",
      "glutes_r",
      "hamstrings_l",
    ],
    muscleGroups: ["Ноги", "Кор"],
    defaultSets: [
      { reps: 10, restSec: 60 },
      { reps: 10, restSec: 60 },
      { reps: 10, restSec: 75 },
    ],
    vbtTargetMs: 0.4,
  },
  {
    id: "boxing_drill",
    name: "Бокс · комбо",
    sport: "boxing",
    primaryMuscles: [
      "shoulders_l",
      "shoulders_r",
      "triceps_l",
      "triceps_r",
      "abs_c",
    ],
    muscleGroups: ["Плечи", "Кор"],
    defaultSets: [
      { reps: 1, restSec: 45 },
      { reps: 1, restSec: 45 },
      { reps: 1, restSec: 60 },
    ],
  },
  {
    id: "tennis_drill",
    name: "Теннис · удары",
    sport: "tennis",
    primaryMuscles: [
      "shoulders_l",
      "shoulders_r",
      "forearms_l",
      "forearms_r",
      "back_c",
    ],
    muscleGroups: ["Плечи", "Спина"],
    defaultSets: [
      { reps: 1, restSec: 40 },
      { reps: 1, restSec: 40 },
      { reps: 1, restSec: 50 },
    ],
  },
  {
    id: "plank_core",
    name: "Планка / кор",
    sport: "strength",
    primaryMuscles: ["abs_c", "abs_l", "abs_r", "back_c"],
    muscleGroups: ["Кор", "Спина"],
    defaultSets: [
      { reps: 1, restSec: 45 },
      { reps: 1, restSec: 45 },
    ],
  },
];

export function exerciseById(id: string): ExerciseDef | undefined {
  return EXERCISE_CATALOG.find((e) => e.id === id);
}

export function exercisesForMuscleGroup(group: string): ExerciseDef[] {
  return EXERCISE_CATALOG.filter((e) => e.muscleGroups.includes(group));
}
