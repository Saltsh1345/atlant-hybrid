import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  analyzeSessionZones,
} from "@/lib/analytics/analyzeSessionBalance";
import {
  buildVelocityDegradationSeries,
  estimateCaloriesKcal,
  estimateTonnageKg,
} from "@/lib/analytics/estimateSessionLoad";
import type {
  AnalyticsDashboardData,
  AnalyticsReport,
  AnalyticsSessionRow,
  MonthlyProgressPoint,
  SessionSummaryPayload,
  ZoneInsight,
} from "@/lib/analytics/types";

interface SessionDbRow {
  id: string;
  completed_at: string;
  sport: string;
  exercise: string | null;
  duration_sec: number;
  avg_velocity: number | null;
  peak_velocity: number | null;
  form_score: number | null;
  reps: number | null;
  summary: SessionSummaryPayload | null;
}

interface ReportDbRow {
  session_id: string;
  tonnage_kg: number;
  calories_est: number;
  peak_angles: Record<string, number>;
  zones: ZoneInsight[];
  gemini_summary: string | null;
  gemini_source: "gemini" | "fallback" | null;
  created_at: string;
}

function mapSession(row: SessionDbRow): AnalyticsSessionRow {
  return {
    id: row.id,
    completedAt: row.completed_at,
    sport: row.sport,
    exercise: row.exercise,
    durationSec: row.duration_sec,
    avgVelocity: row.avg_velocity,
    peakVelocity: row.peak_velocity,
    formScore: row.form_score,
    reps: row.reps,
    summary: row.summary,
  };
}

function mapReport(row: ReportDbRow): AnalyticsReport {
  return {
    sessionId: row.session_id,
    tonnageKg: row.tonnage_kg,
    caloriesEst: row.calories_est,
    peakAngles: row.peak_angles ?? {},
    zones: Array.isArray(row.zones) ? row.zones : [],
    geminiSummary: row.gemini_summary,
    geminiSource: row.gemini_source,
    createdAt: row.created_at,
  };
}

function monthAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMonthlyProgress(
  history: AnalyticsSessionRow[],
  weightKg: number,
): MonthlyProgressPoint[] {
  return [...history]
    .sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    )
    .map((session) => ({
      date: session.completedAt.slice(0, 10),
      avgVelocity: Number((session.avgVelocity ?? 0).toFixed(2)),
      estimatedLoadKg: estimateTonnageKg(session, weightKg),
      reps: session.reps ?? 0,
    }));
}

/** Загружает последнюю сессию, историю месяца, план дня и отчёт аналитики. */
export async function loadAnalyticsDashboard(): Promise<
  AnalyticsDashboardData & { error?: string; needsAuth?: boolean }
> {
  try {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return emptyData({ error: "Supabase не сконфигурирован" });
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return emptyData({ error: "Нужно войти через Google", needsAuth: true });
    }

    const [{ data: profile }, { data: sessionsData }, { data: planData }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("weight_kg")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("workout_sessions")
          .select(
            "id, completed_at, sport, exercise, duration_sec, avg_velocity, peak_velocity, form_score, reps, summary",
          )
          .eq("user_id", user.id)
          .gte("completed_at", monthAgoIso())
          .order("completed_at", { ascending: false })
          .limit(40),
        supabase
          .from("workout_plans")
          .select("target_meshes")
          .eq("user_id", user.id)
          .eq("plan_date", todayDate())
          .maybeSingle(),
      ]);

    const history = ((sessionsData ?? []) as SessionDbRow[]).map(mapSession);
    const session = history[0] ?? null;
    const weightKg =
      typeof profile?.weight_kg === "number" && profile.weight_kg > 0
        ? profile.weight_kg
        : 75;
    const targetMeshes = Array.isArray(planData?.target_meshes)
      ? (planData.target_meshes as string[])
      : [];

    let report: AnalyticsReport | null = null;
    if (session) {
      const { data: reportRow } = await supabase
        .from("analytics_reports")
        .select(
          "session_id, tonnage_kg, calories_est, peak_angles, zones, gemini_summary, gemini_source, created_at",
        )
        .eq("user_id", user.id)
        .eq("session_id", session.id)
        .maybeSingle();
      if (reportRow) report = mapReport(reportRow as ReportDbRow);
    }

    const zones =
      report?.zones?.length
        ? report.zones
        : analyzeSessionZones(session, targetMeshes);

    return {
      session,
      history,
      targetMeshes,
      weightKg,
      report,
      velocitySeries: buildVelocityDegradationSeries(session),
      monthlyProgress: buildMonthlyProgress(history, weightKg),
      zones,
    };
  } catch {
    return emptyData({ error: "Не удалось загрузить аналитику" });
  }
}

function emptyData(extra: {
  error?: string;
  needsAuth?: boolean;
}): AnalyticsDashboardData & { error?: string; needsAuth?: boolean } {
  return {
    session: null,
    history: [],
    targetMeshes: [],
    weightKg: null,
    report: null,
    velocitySeries: [],
    monthlyProgress: [],
    zones: [],
    ...extra,
  };
}

export async function saveAnalyticsReport(report: {
  sessionId: string;
  tonnageKg: number;
  caloriesEst: number;
  peakAngles: Record<string, number>;
  zones: ZoneInsight[];
  geminiSummary: string | null;
  geminiSource: "gemini" | "fallback" | null;
}): Promise<{ error?: string }> {
  try {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return { error: "Supabase не сконфигурирован" };
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: "Нужно войти через Google" };

    const { error } = await supabase.from("analytics_reports").upsert(
      {
        user_id: userData.user.id,
        session_id: report.sessionId,
        tonnage_kg: report.tonnageKg,
        calories_est: report.caloriesEst,
        peak_angles: report.peakAngles,
        zones: report.zones,
        gemini_summary: report.geminiSummary,
        gemini_source: report.geminiSource,
      },
      { onConflict: "user_id,session_id" },
    );

    return error ? { error: error.message } : {};
  } catch {
    return { error: "Не удалось сохранить отчёт аналитики" };
  }
}

export function buildLocalReportDraft(
  session: AnalyticsSessionRow,
  zones: ZoneInsight[],
  weightKg: number,
): Omit<AnalyticsReport, "createdAt" | "geminiSummary" | "geminiSource"> & {
  tonnageKg: number;
  caloriesEst: number;
} {
  return {
    sessionId: session.id,
    tonnageKg: estimateTonnageKg(session, weightKg),
    caloriesEst: estimateCaloriesKcal(session, weightKg),
    peakAngles: {},
    zones,
  };
}
