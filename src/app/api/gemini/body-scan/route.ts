import { NextResponse } from "next/server";
import { analyzeBodyScan, toLatchedBody } from "@/lib/ai/geminiBodyScan";
import type { BodyScanJson } from "@/lib/calibration/bodyScanPayload";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      scan?: BodyScanJson;
      weight?: number;
    };
    if (!body.scan?.summary) {
      return NextResponse.json(
        { error: "scan payload required" },
        { status: 400 }
      );
    }

    const { result, source, reason } = await analyzeBodyScan(body.scan);
    const weight = body.weight ?? body.scan.profile.weight ?? 75;
    const latched = toLatchedBody(result, weight, source);

    return NextResponse.json({
      latched,
      source,
      reason: reason ?? null,
      report: result.report,
      posture: result.posture,
      fatZones: result.fatZones,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Body scan analysis failed",
        reason: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    );
  }
}
