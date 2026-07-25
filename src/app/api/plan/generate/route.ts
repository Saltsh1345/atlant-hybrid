import { NextResponse } from "next/server";
import { generateDailyPlan } from "@/lib/plan/generatePlanWithGemini";
import type { PlanGenerationContext } from "@/lib/plan/types";
import { getRouteAuth } from "@/lib/supabase/routeAuth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { user } = await getRouteAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = (await req.json()) as {
      context?: PlanGenerationContext;
      planDate?: string;
    };
    if (!body.context || !body.planDate) {
      return NextResponse.json(
        { error: "context и planDate обязательны" },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.planDate)) {
      return NextResponse.json(
        { error: "planDate должен быть в формате YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const plan = await generateDailyPlan(body.context, body.planDate);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Не удалось сгенерировать план",
        reason: e instanceof Error ? e.message : "unknown",
      },
      { status: e instanceof SyntaxError ? 400 : 500 },
    );
  }
}
