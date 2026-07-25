import { NextResponse } from "next/server";
import { generateAnalyticsSummary } from "@/lib/analytics/generateAnalyticsSummary";
import { getRouteAuth } from "@/lib/supabase/routeAuth";
import type {
  AnalyticsSessionRow,
  SessionSummaryPayload,
} from "@/lib/analytics/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getRouteAuth(req);
    if (!user || !supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { sessionId?: string };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        "id, completed_at, sport, exercise, duration_sec, avg_velocity, peak_velocity, form_score, reps, summary",
      )
      .eq("user_id", user.id)
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session: AnalyticsSessionRow = {
      id: data.id,
      completedAt: data.completed_at,
      sport: data.sport,
      exercise: data.exercise,
      durationSec: data.duration_sec,
      avgVelocity: data.avg_velocity,
      peakVelocity: data.peak_velocity,
      formScore: data.form_score,
      reps: data.reps,
      summary: (data.summary ?? null) as SessionSummaryPayload | null,
    };

    const result = await generateAnalyticsSummary(session);
    return NextResponse.json({
      summary: result.text,
      source: result.source,
      reason: result.reason ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Analytics summary failed",
        reason: error instanceof Error ? error.message : "unknown",
      },
      { status: error instanceof SyntaxError ? 400 : 500 },
    );
  }
}
