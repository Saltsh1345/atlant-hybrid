import { create } from "zustand";
import type {
  WorkoutMetrics,
  WorkoutPhase,
  WorkoutPlanState,
  WorkoutSetPhase,
} from "@/lib/workout/types";
import type { PlanExercise } from "@/lib/plan/types";

const EMPTY_METRICS: WorkoutMetrics = {
  verticalVelocityMs: 0,
  peakVelocityMs: 0,
  baselineVelocityMs: null,
  fatiguePercent: 0,
  repetitions: 0,
  failed: false,
};

const EMPTY_PLAN: WorkoutPlanState = {
  planId: null,
  programId: null,
  planDate: "",
  planTitle: "",
  exercises: [],
  exerciseIndex: 0,
  setIndex: 0,
  sessionId: null,
  sessionExerciseId: null,
  loadWeightKg: null,
  setPhase: "loading",
  totalReps: 0,
};

interface WorkoutStore {
  phase: WorkoutPhase;
  startedAt: number | null;
  elapsedSec: number;
  metrics: WorkoutMetrics;
  plan: WorkoutPlanState;

  setPhase: (phase: WorkoutPhase) => void;
  setSetPhase: (setPhase: WorkoutSetPhase) => void;
  start: (nowMs: number) => void;
  pause: () => void;
  finish: () => void;
  tick: (nowMs: number) => void;
  setMetrics: (metrics: WorkoutMetrics) => void;
  resetMetrics: () => void;
  initPlan: (opts: {
    planId: string;
    programId: string | null;
    planDate: string;
    planTitle: string;
    exercises: PlanExercise[];
    sessionId: string;
  }) => void;
  setSessionExerciseId: (id: string) => void;
  setLoadWeightKg: (kg: number | null) => void;
  advanceSet: () => { done: boolean; nextExercise: boolean };
  currentExercise: () => PlanExercise | null;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  phase: "ready",
  startedAt: null,
  elapsedSec: 0,
  metrics: EMPTY_METRICS,
  plan: EMPTY_PLAN,

  setPhase: (phase) => set({ phase }),
  setSetPhase: (setPhase) =>
    set((state) => ({ plan: { ...state.plan, setPhase } })),
  start: (nowMs) =>
    set((state) => ({
      phase: "running",
      startedAt: nowMs - state.elapsedSec * 1000,
    })),
  pause: () => set({ phase: "paused", startedAt: null }),
  finish: () => set({ phase: "finished", startedAt: null }),
  tick: (nowMs) => {
    const startedAt = get().startedAt;
    if (get().phase !== "running" || startedAt === null) return;
    set({ elapsedSec: Math.max(0, Math.floor((nowMs - startedAt) / 1000)) });
  },
  setMetrics: (metrics) => set({ metrics }),
  resetMetrics: () => set({ metrics: EMPTY_METRICS }),
  initPlan: (opts) =>
    set({
      plan: {
        planId: opts.planId,
        programId: opts.programId,
        planDate: opts.planDate,
        planTitle: opts.planTitle,
        exercises: opts.exercises,
        exerciseIndex: 0,
        setIndex: 0,
        sessionId: opts.sessionId,
        sessionExerciseId: null,
        loadWeightKg: null,
        setPhase: "awaiting_weight",
        totalReps: 0,
      },
      phase: "ready",
      elapsedSec: 0,
      metrics: EMPTY_METRICS,
    }),
  setSessionExerciseId: (id) =>
    set((state) => ({
      plan: { ...state.plan, sessionExerciseId: id },
    })),
  setLoadWeightKg: (kg) =>
    set((state) => ({
      plan: { ...state.plan, loadWeightKg: kg },
    })),
  currentExercise: () => {
    const { exercises, exerciseIndex } = get().plan;
    return exercises[exerciseIndex] ?? null;
  },
  advanceSet: () => {
    const { plan } = get();
    const exercise = plan.exercises[plan.exerciseIndex];
    if (!exercise) return { done: true, nextExercise: false };

    const nextSetIndex = plan.setIndex + 1;
    if (nextSetIndex < exercise.sets) {
      set({
        plan: {
          ...plan,
          setIndex: nextSetIndex,
          loadWeightKg: plan.loadWeightKg,
          setPhase: "rest",
          sessionExerciseId: null,
        },
        metrics: EMPTY_METRICS,
        phase: "ready",
      });
      return { done: false, nextExercise: false };
    }

    const nextExerciseIndex = plan.exerciseIndex + 1;
    if (nextExerciseIndex < plan.exercises.length) {
      set({
        plan: {
          ...plan,
          exerciseIndex: nextExerciseIndex,
          setIndex: 0,
          loadWeightKg: null,
          setPhase: "awaiting_weight",
          sessionExerciseId: null,
        },
        metrics: EMPTY_METRICS,
        phase: "ready",
      });
      return { done: false, nextExercise: true };
    }

    set((state) => ({
      plan: { ...state.plan, setPhase: "done" },
      phase: "finished",
    }));
    return { done: true, nextExercise: false };
  },
  reset: () =>
    set({
      phase: "ready",
      startedAt: null,
      elapsedSec: 0,
      metrics: EMPTY_METRICS,
      plan: EMPTY_PLAN,
    }),
}));
