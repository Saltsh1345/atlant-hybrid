import { create } from "zustand";
import type { WorkoutMetrics, WorkoutPhase } from "@/lib/workout/types";

const EMPTY_METRICS: WorkoutMetrics = {
  verticalVelocityMs: 0,
  peakVelocityMs: 0,
  baselineVelocityMs: null,
  fatiguePercent: 0,
  repetitions: 0,
  failed: false,
};

interface WorkoutStore {
  phase: WorkoutPhase;
  startedAt: number | null;
  elapsedSec: number;
  metrics: WorkoutMetrics;
  setPhase: (phase: WorkoutPhase) => void;
  start: (nowMs: number) => void;
  pause: () => void;
  finish: () => void;
  tick: (nowMs: number) => void;
  setMetrics: (metrics: WorkoutMetrics) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  phase: "ready",
  startedAt: null,
  elapsedSec: 0,
  metrics: EMPTY_METRICS,
  setPhase: (phase) => set({ phase }),
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
  reset: () =>
    set({
      phase: "ready",
      startedAt: null,
      elapsedSec: 0,
      metrics: EMPTY_METRICS,
    }),
}));
