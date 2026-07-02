import { NextResponse } from "next/server";
import { generateAnalysis } from "@/lib/ai/gemini";

/** Vercel Hobby — до 10 с; на Pro можно поднять до 60 */
export const maxDuration = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, source, reason } = await generateAnalysis({
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
      exercise: body.exercise,
      drillFixations: body.drillFixations,
    });
    return NextResponse.json({ analysis: text, source, reason: reason ?? null });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Analysis failed",
        reason: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    );
  }
}
