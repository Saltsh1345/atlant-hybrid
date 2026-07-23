"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnalyticsAtlasPanel from "@/components/analytics/AnalyticsAtlasPanel";
import AnalyticsCharts from "@/components/analytics/AnalyticsCharts";
import AnalyticsSummaryCard from "@/components/analytics/AnalyticsSummaryCard";
import AnalyticsZoneTooltip from "@/components/analytics/AnalyticsZoneTooltip";
import {
  buildLocalReportDraft,
  loadAnalyticsDashboard,
  saveAnalyticsReport,
} from "@/lib/analytics/loadAnalyticsData";
import { useAnalyticsStore } from "@/store/analyticsStore";

export default function AnalyticsDashboard() {
  const [actionError, setActionError] = useState<string | null>(null);
  const loadState = useAnalyticsStore((s) => s.loadState);
  const error = useAnalyticsStore((s) => s.error);
  const needsAuth = useAnalyticsStore((s) => s.needsAuth);
  const session = useAnalyticsStore((s) => s.session);
  const velocitySeries = useAnalyticsStore((s) => s.velocitySeries);
  const monthlyProgress = useAnalyticsStore((s) => s.monthlyProgress);
  const zones = useAnalyticsStore((s) => s.zones);
  const selectedZone = useAnalyticsStore((s) => s.selectedZone);
  const report = useAnalyticsStore((s) => s.report);
  const weightKg = useAnalyticsStore((s) => s.weightKg);
  const summarizing = useAnalyticsStore((s) => s.summarizing);
  const setSelectedZone = useAnalyticsStore((s) => s.setSelectedZone);
  const setDashboard = useAnalyticsStore((s) => s.setDashboard);
  const setLoadState = useAnalyticsStore((s) => s.setLoadState);
  const setSummarizing = useAnalyticsStore((s) => s.setSummarizing);
  const patchReport = useAnalyticsStore((s) => s.patchReport);
  const reset = useAnalyticsStore((s) => s.reset);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    void loadAnalyticsDashboard().then((data) => {
      if (!active) return;
      setDashboard(data);
    });
    return () => {
      active = false;
      reset();
    };
  }, [reset, setDashboard, setLoadState]);

  async function generateSummary() {
    if (!session || summarizing) return;
    setSummarizing(true);
    setActionError(null);
    try {
      const response = await fetch("/api/analytics/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const payload = (await response.json()) as {
        summary?: string;
        source?: "gemini" | "fallback";
        error?: string;
      };
      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "Не удалось получить резюме");
      }

      const draft = buildLocalReportDraft(
        session,
        zones,
        weightKg && weightKg > 0 ? weightKg : 75,
      );
      const nextReport = {
        ...draft,
        geminiSummary: payload.summary,
        geminiSource: payload.source ?? "fallback",
        createdAt: new Date().toISOString(),
      };
      const { error: saveError } = await saveAnalyticsReport({
        sessionId: nextReport.sessionId,
        tonnageKg: nextReport.tonnageKg,
        caloriesEst: nextReport.caloriesEst,
        peakAngles: nextReport.peakAngles,
        zones: nextReport.zones,
        geminiSummary: nextReport.geminiSummary,
        geminiSource: nextReport.geminiSource,
      });
      patchReport(nextReport);
      if (saveError) {
        setActionError(`Резюме получено, но отчёт не сохранён: ${saveError}`);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Ошибка генерации резюме",
      );
    } finally {
      setSummarizing(false);
    }
  }

  if (needsAuth) {
    return (
      <main className="min-h-screen bg-[#04070d] px-4 py-16 text-zinc-100">
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
          <h1 className="text-xl font-semibold tracking-wide">Нужен вход</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Аналитика доступна после авторизации через Google.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl border border-cyan-300/40 px-5 py-2 text-xs font-semibold tracking-wider text-cyan-100"
          >
            НА ГЛАВНУЮ
          </Link>
        </div>
      </main>
    );
  }

  const tonnage =
    report?.tonnageKg ??
    (session
      ? buildLocalReportDraft(
          session,
          zones,
          weightKg && weightKg > 0 ? weightKg : 75,
        ).tonnageKg
      : null);
  const calories =
    report?.caloriesEst ??
    (session
      ? buildLocalReportDraft(
          session,
          zones,
          weightKg && weightKg > 0 ? weightKg : 75,
        ).caloriesEst
      : null);

  return (
    <main className="min-h-screen bg-[#04070d] text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-cyan-300/70">
              Atlant-Hybrid · Этап 5
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-wide">
              Аналитика и прогресс
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Post-workout атлас, графики VBT/тоннажа и текстовое резюме по
              последней тренировке.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/plan"
              className="rounded-xl border border-white/15 px-4 py-2 text-xs tracking-wider text-zinc-300"
            >
              ПЛАН
            </Link>
            <Link
              href="/workout"
              className="rounded-xl border border-white/15 px-4 py-2 text-xs tracking-wider text-zinc-300"
            >
              WORKOUT
            </Link>
          </div>
        </header>

        {loadState === "loading" && (
          <p className="text-sm text-cyan-200">Загрузка отчёта...</p>
        )}
        {(error || actionError) && (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {actionError ?? error}
          </p>
        )}
        {!session && loadState === "ready" && (
          <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Нет сохранённых тренировок за 30 дней. Завершите сессию на `/workout`.
          </p>
        )}

        {session && (
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
            Последняя сессия:{" "}
            <span className="text-cyan-100">
              {session.exercise ?? session.sport}
            </span>
            {" · "}
            {new Date(session.completedAt).toLocaleString("ru-RU")}
            {" · "}
            {session.reps ?? 0} повт. · {session.durationSec} с
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <AnalyticsAtlasPanel
            zones={zones}
            selectedZone={selectedZone}
            onZoneSelect={setSelectedZone}
          />
          <div className="flex flex-col gap-4">
            <AnalyticsZoneTooltip zones={zones} selectedZone={selectedZone} />
            <AnalyticsSummaryCard
              summary={report?.geminiSummary ?? null}
              source={report?.geminiSource ?? null}
              summarizing={summarizing}
              tonnageKg={tonnage}
              caloriesEst={calories}
              onGenerate={() => void generateSummary()}
              disabled={!session}
            />
            <AnalyticsCharts
              velocitySeries={velocitySeries}
              monthlyProgress={monthlyProgress}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
