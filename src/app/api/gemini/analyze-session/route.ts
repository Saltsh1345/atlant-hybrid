import { NextResponse } from "next/server";
import { analyzeSessionWithVideo } from "@/lib/ai/geminiVideoAnalysis";
import type { SessionVideoClip } from "@/lib/training/sessionVideoClips";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clips = (body.clips ?? []) as SessionVideoClip[];

    const result = await analyzeSessionWithVideo(clips, {
      sport: body.sport ?? "strength",
      durationSec: body.durationSec ?? 0,
      avgVelocity: body.avgVelocity ?? 0,
      peakPunchSpeed: body.peakPunchSpeed ?? 0,
      peakVelocity: body.peakVelocity,
      fatigue: body.fatigue ?? 0,
      formScore: body.formScore,
      reps: body.reps,
      punches: body.punches,
      swings: body.swings,
      readinessScore: body.readinessScore,
      exercise: body.exercise,
      drillFixations: body.drillFixations,
    });

    return NextResponse.json({
      analysis: result.analysis,
      source: result.source,
      reason: result.reason ?? null,
      clipAnalyses: result.clipAnalyses,
      yoloSignals: result.yoloSignals,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Video analysis failed",
        reason: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    );
  }
}
