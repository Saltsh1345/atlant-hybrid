import { NextResponse } from "next/server";
import { analyzeBodyScan, toLatchedBody } from "@/lib/ai/geminiBodyScan";
import type { BodyScanJson } from "@/lib/calibration/bodyScanPayload";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      scan?: BodyScanJson;
      weight?: number;
      keyframes?: import("@/lib/bio/captureScanFrame").ScanKeyframes;
      scanQuality?: import("@/lib/bio/scanQuality").BioScanQuality;
    };
    if (!body.scan?.summary) {
      return NextResponse.json(
        { error: "scan payload required" },
        { status: 400 }
      );
    }

    const { result, source, reason } = await analyzeBodyScan(
      body.scan,
      body.keyframes
    );
    const weight = body.weight ?? body.scan.profile.weight ?? 75;
    const latched = toLatchedBody(result, weight, source, {
      anthropometrics: body.scan.anthropometrics,
      bioSignature: body.scan.bioSignature,
      scanQuality: body.scanQuality,
      scanNote:
        body.scanQuality?.tier === "low"
          ? `Низкое качество скана (${body.scanQuality.score}/100). Пересканируйте в облегающей одежде.`
          : undefined,
    });

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
