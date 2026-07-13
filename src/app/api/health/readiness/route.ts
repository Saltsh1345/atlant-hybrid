import { NextResponse } from "next/server";
import { computeHealthReadiness } from "@/lib/health/readinessScore";
import type { HealthMetricsSnapshot } from "@/types";

export async function GET(req: Request) {
  try {
    const base = new URL(req.url);
    const metricsRes = await fetch(new URL("/api/health/metrics", base.origin), {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    if (!metricsRes.ok) {
      return NextResponse.json(
        { error: "Health metrics unavailable" },
        { status: metricsRes.status === 401 ? 401 : 502 }
      );
    }

    const data = (await metricsRes.json()) as {
      metrics?: HealthMetricsSnapshot;
    };
    if (!data.metrics) {
      return NextResponse.json(
        { error: "Invalid health metrics response" },
        { status: 502 }
      );
    }
    return NextResponse.json(computeHealthReadiness(data.metrics));
  } catch {
    return NextResponse.json(
      { error: "Health readiness unavailable" },
      { status: 502 }
    );
  }
}
