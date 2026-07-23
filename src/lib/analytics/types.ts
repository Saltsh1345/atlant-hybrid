/**
 * Контракты Этапа 5 — `/analytics`.
 * Не меняют замороженные типы Stage 4: читают `workout_sessions`
 * и пишут отдельный отчёт `analytics_reports`.
 */

import type { AtlasLoadStatus } from "@/types/atlas";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";

export type AnalyticsLoadState = "idle" | "loading" | "ready" | "error";

export interface SessionSummaryPayload {
  verticalVelocityMs?: number;
  peakVelocityMs?: number;
  baselineVelocityMs?: number;
  fatiguePercent?: number;
  failed?: boolean;
}

export interface AnalyticsSessionRow {
  id: string;
  completedAt: string;
  sport: string;
  exercise: string | null;
  durationSec: number;
  avgVelocity: number | null;
  peakVelocity: number | null;
  formScore: number | null;
  reps: number | null;
  summary: SessionSummaryPayload | null;
}

export interface ZoneInsight {
  zone: MuscleMeshName;
  status: AtlasLoadStatus;
  loadLabel: string;
  recommendation: string;
}

export interface AnalyticsReport {
  sessionId: string;
  tonnageKg: number;
  caloriesEst: number;
  peakAngles: Record<string, number>;
  zones: ZoneInsight[];
  geminiSummary: string | null;
  geminiSource: "gemini" | "fallback" | null;
  createdAt: string;
}

export interface VelocityPoint {
  label: string;
  velocityMs: number;
  note?: string;
}

export interface MonthlyProgressPoint {
  date: string;
  avgVelocity: number;
  estimatedLoadKg: number;
  reps: number;
}

export interface AnalyticsDashboardData {
  session: AnalyticsSessionRow | null;
  history: AnalyticsSessionRow[];
  targetMeshes: string[];
  weightKg: number | null;
  report: AnalyticsReport | null;
  velocitySeries: VelocityPoint[];
  monthlyProgress: MonthlyProgressPoint[];
  zones: ZoneInsight[];
}
