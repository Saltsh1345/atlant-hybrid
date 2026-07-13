import { NextResponse } from "next/server";
import { analyzeSessionWithVideo } from "@/lib/ai/geminiVideoAnalysis";
import type { SessionVideoClip } from "@/lib/training/sessionVideoClips";

export const maxDuration = 120;

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
    const clips = (Array.isArray(body.clips) ? body.clips : [])
      .filter((clip): clip is SessionVideoClip => {
        if (!clip || typeof clip !== "object") return false;
        const item = clip as Partial<SessionVideoClip>;
        return (
          typeof item.id === "string" &&
          typeof item.label === "string" &&
          typeof item.expectedAction === "string" &&
          typeof item.base64 === "string" &&
          item.base64.length <= 8_000_000 &&
          (item.mimeType === "video/webm" || item.mimeType === "video/mp4")
        );
      })
      .slice(0, 4);
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

    const result = await analyzeSessionWithVideo(clips, {
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
        ? (body.drillFixations as Parameters<typeof analyzeSessionWithVideo>[1]["drillFixations"])
        : undefined,
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
      { status: e instanceof SyntaxError ? 400 : 500 }
    );
  }
}
