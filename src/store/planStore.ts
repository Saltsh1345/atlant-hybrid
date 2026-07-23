import { create } from "zustand";
import type {
  DailyPlan,
  PlanGenerationContext,
  PlanSessionRow,
} from "@/lib/plan/types";

export type PlanLoadState = "idle" | "loading" | "ready" | "error";

interface PlanStore {
  loadState: PlanLoadState;
  generating: boolean;
  error: string | null;
  /** YYYY-MM-DD выбранного дня в календаре */
  selectedDate: string;
  /** Планы по дате */
  plans: Record<string, DailyPlan>;
  /** Выполненные тренировки видимого диапазона */
  sessions: PlanSessionRow[];
  context: PlanGenerationContext | null;

  setLoadState: (state: PlanLoadState) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedDate: (date: string) => void;
  setPlans: (plans: DailyPlan[]) => void;
  upsertPlan: (plan: DailyPlan) => void;
  setSessions: (sessions: PlanSessionRow[]) => void;
  setContext: (context: PlanGenerationContext | null) => void;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const usePlanStore = create<PlanStore>((set) => ({
  loadState: "idle",
  generating: false,
  error: null,
  selectedDate: toDateKey(new Date()),
  plans: {},
  sessions: [],
  context: null,

  setLoadState: (loadState) => set({ loadState }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setPlans: (plans) =>
    set({
      plans: Object.fromEntries(plans.map((plan) => [plan.planDate, plan])),
    }),
  upsertPlan: (plan) =>
    set((state) => ({
      plans: { ...state.plans, [plan.planDate]: plan },
    })),
  setSessions: (sessions) => set({ sessions }),
  setContext: (context) => set({ context }),
}));
