"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardDesktopGrid from "@/components/dashboard/DashboardDesktopGrid";
import {
  DashboardMobileModular,
  buildDashboardWidgets,
  type DashboardWidgetContext,
} from "@/components/dashboard/DashboardWidgets";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import { computeMuscleReadiness } from "@/lib/readiness";
import { generateWorkoutPlan } from "@/lib/ai/workoutPlan";
import { goToTraining } from "@/lib/navigation/goToTraining";
import type { Sport, StrengthExercise } from "@/types";

export default function DashboardScreen() {
  const profile = useAppStore((s) => s.profile);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const lastSession = useAppStore((s) => s.lastSession);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const setPhase = useAppStore((s) => s.setPhase);
  const requestRescan = useAppStore((s) => s.requestRescan);

  const focusSportPicker = useDashboardLayoutStore((s) => s.focusSportPicker);
  const setFocusSportPicker = useDashboardLayoutStore((s) => s.setFocusSportPicker);

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

  useEffect(() => {
    if (!focusSportPicker) return;
    const t = window.setTimeout(() => {
      document
        .getElementById("dashboard-sport-picker")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusSportPicker(false);
    }, 200);
    return () => window.clearTimeout(t);
  }, [focusSportPicker, setFocusSportPicker]);

  const startTraining = useCallback(
    (sport: Sport, exercise?: StrengthExercise) => {
      goToTraining(sport, exercise);
    },
    []
  );

  const exportData = async () => {
    const payload = {
      profile,
      latchedBody,
      lastSession,
      sessionHistory,
      exportedAt: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setExportMsg("Скопировано");
    } catch {
      setExportMsg("Ошибка");
    }
    setTimeout(() => setExportMsg(""), 2500);
  };

  const goToScan = () => {
    if (bodyDataLocked) requestRescan();
    setPhase("calibration");
  };

  const widgetCtx: DashboardWidgetContext = useMemo(
    () => ({
      profile,
      bodyDataLocked,
      latchedBody,
      readiness,
      plan,
      geminiOk,
      lastSession,
      sessionHistory,
      showBodyTiles: !bodyDataLocked,
      onScan: goToScan,
      onSelectSport: startTraining,
      onTwinLive: bodyDataLocked ? () => setPhase("twin-live") : undefined,
      exportData,
      exportMsg,
    }),
    [
      profile,
      bodyDataLocked,
      latchedBody,
      readiness,
      plan,
      geminiOk,
      lastSession,
      sessionHistory,
      exportMsg,
      startTraining,
      setPhase,
    ]
  );

  const desktopWidgets = useMemo(
    () => buildDashboardWidgets(widgetCtx, { highlightSport: focusSportPicker }),
    [widgetCtx, focusSportPicker]
  );

  const userName = profile?.age ? `Атлет ${profile.age}` : "Атлет";

  const handleNav = (phase: Parameters<typeof setPhase>[0]) => {
    if (phase === "calibration") {
      goToScan();
      return;
    }
    setPhase(phase);
  };

  return (
    <motion.div
      className="min-h-dvh w-full bg-[#f4f7fb] pb-20 lg:pb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="lg:hidden px-4 py-6">
        <PwaInstallBanner />
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Дашборд</h1>
          <p className="text-xs text-slate-500">Выбор тренировки и виджеты</p>
        </header>
        <DashboardMobileModular
          ctx={widgetCtx}
          highlightSport={focusSportPicker}
        />
      </div>

      <div className="hidden lg:block">
        <PwaInstallBanner />
        <DashboardShell
          userName={userName}
          geminiOk={geminiOk}
          onNav={handleNav}
        >
          <DashboardDesktopGrid
            widgets={desktopWidgets}
            showBodyTiles={!bodyDataLocked}
          />
        </DashboardShell>
      </div>
    </motion.div>
  );
}
