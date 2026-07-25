"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlanStore, toDateKey } from "@/store/planStore";
import { loadPlanContext } from "@/lib/plan/planContext";
import {
  loadPlansInRange,
  loadSessionsInRange,
  savePlan,
} from "@/lib/plan/persistPlan";
import type { DailyPlan } from "@/lib/plan/types";
import PlanCalendar from "@/components/plan/PlanCalendar";
import TodayExerciseCards from "@/components/plan/TodayExerciseCards";
import PlanAtlasPanel from "@/components/plan/PlanAtlasPanel";
import StartWorkoutButton from "@/components/plan/StartWorkoutButton";
import { authFetch } from "@/lib/supabase/authFetch";

function monthRange(monthDate: Date): { from: string; to: string } {
  const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  from.setDate(from.getDate() - 7);
  const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  to.setDate(to.getDate() + 7);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export default function PlanDashboard() {
  const {
    loadState,
    generating,
    error,
    selectedDate,
    plans,
    sessions,
    context,
    setLoadState,
    setGenerating,
    setError,
    setSelectedDate,
    setPlans,
    upsertPlan,
    setSessions,
    setContext,
  } = usePlanStore();

  const [monthDate, setMonthDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [needsAuth, setNeedsAuth] = useState(false);

  const refreshMonth = useCallback(
    async (target: Date) => {
      const { from, to } = monthRange(target);
      const [monthPlans, monthSessions] = await Promise.all([
        loadPlansInRange(from, to),
        loadSessionsInRange(`${from}T00:00:00Z`, `${to}T23:59:59Z`),
      ]);
      setPlans(monthPlans);
      setSessions(monthSessions);
    },
    [setPlans, setSessions],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");

    void (async () => {
      try {
        const loaded = await loadPlanContext();
        if (cancelled) return;
        if (!loaded) {
          setNeedsAuth(true);
          setLoadState("ready");
          return;
        }
        setContext(loaded.context);
        await refreshMonth(monthDate);
        if (!cancelled) setLoadState("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не удалось загрузить план");
        setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Загружаем контекст один раз; месяц обновляется через onMonthChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMonthChange = useCallback(
    (next: Date) => {
      setMonthDate(next);
      void refreshMonth(next);
    },
    [refreshMonth],
  );

  const generatePlan = useCallback(async () => {
    if (!context || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await authFetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, planDate: selectedDate }),
      });
      const payload = (await response.json()) as {
        plan?: DailyPlan;
        error?: string;
        reason?: string;
      };
      if (!response.ok || !payload.plan) {
        const detail = payload.reason ?? payload.error;
        if (response.status === 401) {
          throw new Error(
            "Сессия истекла. Войдите через Google на главной и попробуйте снова.",
          );
        }
        throw new Error(detail ?? "Не удалось сгенерировать план");
      }
      upsertPlan(payload.plan);
      const { error: saveError } = await savePlan(payload.plan);
      if (saveError) {
        const migrationHint = /workout_plans|schema cache|relation/i.test(
          saveError,
        )
          ? " Примените миграцию supabase/migrations/202607200003_stage_03_workout_plans.sql в Supabase SQL Editor."
          : "";
        setError(
          `План на экране есть, но не сохранён в Supabase: ${saveError}.${migrationHint}`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка генерации плана");
    } finally {
      setGenerating(false);
    }
  }, [context, generating, selectedDate, setGenerating, setError, upsertPlan]);

  const selectedPlan = plans[selectedDate] ?? null;

  const planDates = useMemo(() => new Set(Object.keys(plans)), [plans]);
  const sessionDates = useMemo(
    () => new Set(sessions.map((s) => s.completedAt.slice(0, 10))),
    [sessions],
  );

  if (loadState === "loading" || loadState === "idle") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#04070d]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </main>
    );
  }

  if (needsAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#04070d] p-6">
        <div className="max-w-sm rounded-2xl border border-cyan-300/15 bg-[#060b13] p-6 text-center">
          <h1 className="text-lg font-bold text-cyan-100">Нужен вход</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Чтобы увидеть план тренировок, войдите через Google на главной
            странице.
          </p>
          <Link
            href="/"
            className="mt-5 block w-full rounded-2xl border border-cyan-200/50 bg-cyan-300 px-6 py-3 text-sm font-bold tracking-[0.08em] text-black transition hover:bg-cyan-200"
          >
            НА ГЛАВНУЮ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#04070d] px-4 py-6 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="text-xl font-bold tracking-[0.14em] text-cyan-100">
            ПЛАН ТРЕНИРОВОК
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Готовность: {context?.readinessOverall ?? "—"}% · план строится по
            профилю, скану осанки и истории тренировок
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-xs text-amber-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-4">
            <PlanCalendar
              monthDate={monthDate}
              selectedDate={selectedDate}
              planDates={planDates}
              sessionDates={sessionDates}
              onSelectDate={setSelectedDate}
              onMonthChange={handleMonthChange}
            />
            <PlanAtlasPanel
              readinessGroups={context?.readinessGroups ?? []}
              plan={selectedPlan}
            />
          </div>

          <div className="flex flex-col gap-4">
            <TodayExerciseCards
              plan={selectedPlan}
              generating={generating}
              onGenerate={() => void generatePlan()}
            />
            <StartWorkoutButton hasPlan={selectedPlan !== null} />
          </div>
        </div>
      </div>
    </main>
  );
}
