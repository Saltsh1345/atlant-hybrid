import { NextResponse } from "next/server";
import { computeHealthReadiness } from "@/lib/health/readinessScore";

export async function GET(req: Request) {
  const base = new URL(req.url);
  const metricsRes = await fetch(new URL("/api/health/metrics", base.origin), {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!metricsRes.ok) {
    return NextResponse.json({ error: "Health metrics unavailable" }, { status: 401 });
  }

  const data = (await metricsRes.json()) as { metrics: any };
  const readiness = computeHealthReadiness(data.metrics);
  return NextResponse.json(readiness);
}
