import { NextResponse } from "next/server";
import { generateAnalysis } from "@/lib/ai/gemini";

/** Vercel Hobby — до 10 с; локально и на Pro можно дольше */
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "JSON object required" },
        { status: 400 }
      );
    }
    const body = parsed as Record<string, unknown>;
    const sport =
      body.sport === "boxing" ||
      body.sport === "tennis" ||
      body.sport === "strength"
        ? body.sport
        : "strength";
    const numberOr = (value: unknown, fallback = 0) => {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    };
    const { text, source, reason } = await generateAnalysis({
      sport,
      durationSec: Math.max(0, numberOr(body.durationSec)),
      avgVelocity: Math.max(0, numberOr(body.avgVelocity)),
      peakPunchSpeed: Math.max(0, numberOr(body.peakPunchSpeed)),
      peakVelocity:
        body.peakVelocity == null ? undefined : numberOr(body.peakVelocity),
      fatigue: Math.max(0, Math.min(100, numberOr(body.fatigue))),
      formScore:
        body.formScore == null ? undefined : numberOr(body.formScore),
      reps: body.reps == null ? undefined : numberOr(body.reps),
      punches: body.punches == null ? undefined : numberOr(body.punches),
      swings: body.swings == null ? undefined : numberOr(body.swings),
      readinessScore:
        body.readinessScore == null
          ? undefined
          : numberOr(body.readinessScore),
      exercise: typeof body.exercise === "string" ? body.exercise : undefined,
      drillFixations: Array.isArray(body.drillFixations)
        ? (body.drillFixations as Parameters<typeof generateAnalysis>[0]["drillFixations"])
        : undefined,
    });
    return NextResponse.json({ analysis: text, source, reason: reason ?? null });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Analysis failed",
        reason: e instanceof Error ? e.message : "unknown",
      },
      { status: e instanceof SyntaxError ? 400 : 500 }
    );
  }
}
