import { create } from "zustand";
import type {
  AnalyticsLoadState,
  AnalyticsReport,
  AnalyticsSessionRow,
  MonthlyProgressPoint,
  VelocityPoint,
  ZoneInsight,
} from "@/lib/analytics/types";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";

interface AnalyticsStore {
  loadState: AnalyticsLoadState;
  error: string | null;
  needsAuth: boolean;
  session: AnalyticsSessionRow | null;
  history: AnalyticsSessionRow[];
  targetMeshes: string[];
  weightKg: number | null;
  report: AnalyticsReport | null;
  velocitySeries: VelocityPoint[];
  monthlyProgress: MonthlyProgressPoint[];
  zones: ZoneInsight[];
  selectedZone: MuscleMeshName | null;
  summarizing: boolean;
  setSelectedZone: (zone: MuscleMeshName | null) => void;
  setDashboard: (payload: {
    session: AnalyticsSessionRow | null;
    history: AnalyticsSessionRow[];
    targetMeshes: string[];
    weightKg: number | null;
    report: AnalyticsReport | null;
    velocitySeries: VelocityPoint[];
    monthlyProgress: MonthlyProgressPoint[];
    zones: ZoneInsight[];
    error?: string;
    needsAuth?: boolean;
  }) => void;
  setLoadState: (state: AnalyticsLoadState) => void;
  setSummarizing: (value: boolean) => void;
  patchReport: (report: AnalyticsReport) => void;
  reset: () => void;
}

const initial = {
  loadState: "idle" as AnalyticsLoadState,
  error: null as string | null,
  needsAuth: false,
  session: null as AnalyticsSessionRow | null,
  history: [] as AnalyticsSessionRow[],
  targetMeshes: [] as string[],
  weightKg: null as number | null,
  report: null as AnalyticsReport | null,
  velocitySeries: [] as VelocityPoint[],
  monthlyProgress: [] as MonthlyProgressPoint[],
  zones: [] as ZoneInsight[],
  selectedZone: null as MuscleMeshName | null,
  summarizing: false,
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  ...initial,
  setSelectedZone: (selectedZone) => set({ selectedZone }),
  setLoadState: (loadState) => set({ loadState }),
  setSummarizing: (summarizing) => set({ summarizing }),
  setDashboard: (payload) =>
    set({
      loadState: payload.error ? "error" : "ready",
      error: payload.error ?? null,
      needsAuth: payload.needsAuth ?? false,
      session: payload.session,
      history: payload.history,
      targetMeshes: payload.targetMeshes,
      weightKg: payload.weightKg,
      report: payload.report,
      velocitySeries: payload.velocitySeries,
      monthlyProgress: payload.monthlyProgress,
      zones: payload.zones,
    }),
  patchReport: (report) => set({ report }),
  reset: () => set(initial),
}));
