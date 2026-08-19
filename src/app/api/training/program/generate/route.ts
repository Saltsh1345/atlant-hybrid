import { NextResponse } from "next/server";
import { loadPlanContextServer } from "@/lib/plan/planContextServer";
import { generateProgram } from "@/lib/training/program/generateProgram";
import { persistProgramServer } from "@/lib/training/program/persistProgram";
import { getRouteAuth } from "@/lib/supabase/routeAuth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getRouteAuth(req);
    if (!user || !supabase) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = (await req.json()) as { startDate?: string };
    const startDate =
      body.startDate && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
        ? body.startDate
        : new Date().toISOString().slice(0, 10);

    const loaded = await loadPlanContextServer(supabase, user.id);
    if (!loaded?.context.trainingIntake) {
      return NextResponse.json(
        { error: "Сначала пройдите опросник на /plan" },
        { status: 400 },
      );
    }

    const generated = generateProgram(
      loaded.context.trainingIntake,
      loaded.context,
      startDate,
    );

    const result = await persistProgramServer(supabase, user.id, generated);
    if (result.error) {
      const migrationHint = /training_programs|user_training_intake|schema cache|relation/i.test(
        result.error,
      )
        ? " Примените миграцию supabase/migrations/202607270001_stage_06_training_intelligence.sql"
        : "";
      return NextResponse.json(
        { error: result.error + migrationHint },
        { status: 500 },
      );
    }

    return NextResponse.json({
      programId: result.programId,
      plansSaved: result.plansSaved,
      title: generated.title,
      weeksTotal: loaded.context.trainingIntake.programWeeksFinal,
      dailyPlans: generated.dailyPlans.map((d) => ({
        planDate: d.planDate,
        title: d.plan.title,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Не удалось создать программу",
        reason: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}
