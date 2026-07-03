"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import DashboardDesktopGrid from "@/components/dashboard/DashboardDesktopGrid";
import {
  buildDashboardWidgets,
  DashboardMobileLayout,
  type DashboardWidgetContext,
} from "@/components/dashboard/DashboardWidgets";
import { useAppStore } from "@/store/useAppStore";
import { computeMuscleReadiness } from "@/lib/readiness";
import { generateWorkoutPlan } from "@/lib/ai/workoutPlan";
import type { FitnessGoal } from "@/types";

const GOAL_NAMES: Record<FitnessGoal, string> = {
  lose_weight: "Похудение",
  gain_muscle: "Набор мышц",
  maintain: "Поддержание",
  performance: "Результат",
};

export default function DashboardScreen() {
  const profile = useAppStore((s) => s.profile);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const lastSession = useAppStore((s) => s.lastSession);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const setPhase = useAppStore((s) => s.setPhase);
  const requestRescan = useAppStore((s) => s.requestRescan);
  const [geminiOk, setGeminiOk] = useState<boolean | null>(null);
  const [exportMsg, setExportMsg] = useState("");

  const readiness = useMemo(
    () => computeMuscleReadiness(latchedBody, lastSession, sessionHistory),
    [latchedBody, lastSession, sessionHistory]
  );

  const plan = useMemo(() => {
    if (!profile) return null;
    return generateWorkoutPlan({
      goal: profile.goal ?? "maintain",
      readiness,
      lastSport: lastSession?.sport,
      lastExercise: lastSession?.exercise,
    });
  }, [profile, readiness, lastSession]);

  useEffect(() => {
    fetch("/api/gemini/status")
      .then((r) => r.json())
      .then((d) => setGeminiOk(d.configured))
      .catch(() => setGeminiOk(false));
  }, []);

  const exportData = async () => {
    const payload = {
      profile,
      latchedBody,
      lastSession,
      sessionHistory,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setExportMsg("Скопировано в буфер");
    } catch {
      setExportMsg("Не удалось скопировать");
    }
    setTimeout(() => setExportMsg(""), 2500);
  };

  const goToScan = () => {
    if (bodyDataLocked) requestRescan();
    setPhase("calibration");
  };

  const widgetCtx: DashboardWidgetContext = useMemo(
    () => ({
      bodyDataLocked,
      latchedBody,
      readiness,
      plan,
      geminiOk,
      lastSession,
      sessionHistory,
      showBodyTiles: !bodyDataLocked,
      onScan: goToScan,
      onTraining: () => setPhase("sport-select"),
      onTwinLive: bodyDataLocked ? () => setPhase("twin-live") : undefined,
      exportData,
      exportMsg,
    }),
    [
      bodyDataLocked,
      latchedBody,
      readiness,
      plan,
      geminiOk,
      lastSession,
      sessionHistory,
      exportMsg,
      setPhase,
    ]
  );

  const { widgets, availableToAdd } = useMemo(
    () => buildDashboardWidgets(widgetCtx),
    [widgetCtx]
  );

  return (
    <motion.div
      className="mx-auto min-h-dvh w-full max-w-7xl bg-gradient-to-b from-white to-cyan-50/30 px-4 py-6 pb-24 sm:px-6 md:py-8 lg:px-8 lg:py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="mb-6 lg:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-sm font-black text-white shadow-md sm:h-11 sm:w-11">
              A
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-700">
                Atlant Hybrid
              </p>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
                Дашборд
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="atlant-hud-pill !py-1 !text-[9px] !text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              В сети
            </span>
            <Button
              size="md"
              className="!w-auto hidden sm:inline-flex lg:hidden"
              onClick={() => setPhase("sport-select")}
            >
              Тренировка
            </Button>
            <button
              type="button"
              onClick={() => setPhase("settings")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
              aria-label="Настройки"
            >
              ⚙️
            </button>
          </div>
        </div>

        {profile && (
          <p className="mt-3 font-mono text-[10px] text-cyan-800/80 sm:text-xs">
            [ПРОФИЛЬ · {profile.height}см · {profile.weight}кг · {profile.age}л
            {profile.goal && GOAL_NAMES[profile.goal]
              ? ` · ${GOAL_NAMES[profile.goal]}`
              : ""}
            ]
          </p>
        )}
      </header>

      <PwaInstallBanner />

      {/* Планшет и телефон — фиксированная сетка */}
      <div className="lg:hidden">
        <DashboardMobileLayout ctx={widgetCtx} />
      </div>

      {/* Монитор — drag & resize */}
      <div className="hidden lg:block">
        <DashboardDesktopGrid
          widgets={widgets}
          availableToAdd={availableToAdd}
        />
      </div>
    </motion.div>
  );
}
