"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ApexOverview from "@/components/dashboard/ApexOverview";
import ApexSportSelect from "@/components/dashboard/ApexSportSelect";
import ApexTwinScanPanel, {
  type SensorChip,
} from "@/components/dashboard/ApexTwinScanPanel";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import { computeMuscleReadiness } from "@/lib/readiness";
import { computeOverviewData } from "@/lib/dashboard/overviewMetrics";
import { goToTraining } from "@/lib/navigation/goToTraining";
import AppIcon from "@/components/ui/AppIcon";
import type { AppPhase, Sport, StrengthExercise } from "@/types";

export default function DashboardScreen() {
  const profile = useAppStore((s) => s.profile);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const lastSession = useAppStore((s) => s.lastSession);
  const sessionHistory = useAppStore((s) => s.sessionHistory);
  const setPhase = useAppStore((s) => s.setPhase);
  const requestRescan = useAppStore((s) => s.requestRescan);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const healthConnected = useAppStore((s) => s.healthConnected);
  const healthReadiness = useAppStore((s) => s.healthReadiness);
  const refreshHealthReadiness = useAppStore((s) => s.refreshHealthReadiness);

  const focusSportPicker = useDashboardLayoutStore((s) => s.focusSportPicker);
  const setFocusSportPicker = useDashboardLayoutStore(
    (s) => s.setFocusSportPicker
  );

  const [cameraState, setCameraState] = useState<
    "unknown" | "granted" | "denied" | "prompt"
  >("unknown");
  const [geminiOk, setGeminiOk] = useState<boolean | null>(null);

  useEffect(() => {
    void refreshHealthReadiness();
  }, [refreshHealthReadiness]);

  useEffect(() => {
    fetch("/api/gemini/status")
      .then((r) => r.json())
      .then((d) => setGeminiOk(!!d.configured))
      .catch(() => setGeminiOk(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkCamera() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          if (!cancelled) setCameraState("unknown");
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some((d) => d.kind === "videoinput");
        if (!hasCam) {
          if (!cancelled) setCameraState("unknown");
          return;
        }
        const perm = (
          navigator as Navigator & {
            permissions?: {
              query: (q: { name: string }) => Promise<{ state: string }>;
            };
          }
        ).permissions;
        if (perm?.query) {
          const status = await perm.query({ name: "camera" });
          if (!cancelled) {
            setCameraState(
              status.state === "granted"
                ? "granted"
                : status.state === "denied"
                  ? "denied"
                  : "prompt"
            );
          }
          return;
        }
        if (!cancelled) setCameraState("prompt");
      } catch {
        if (!cancelled) setCameraState("unknown");
      }
    }
    void checkCamera();
    return () => {
      cancelled = true;
    };
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

  const readiness = useMemo(
    () => computeMuscleReadiness(latchedBody, lastSession, sessionHistory),
    [latchedBody, lastSession, sessionHistory]
  );

  const recoveryScore = healthReadiness?.score ?? readiness.overall;

  const overview = useMemo(
    () =>
      computeOverviewData(
        sessionHistory,
        recoveryScore,
        profile?.weight ?? 75
      ),
    [sessionHistory, recoveryScore, profile?.weight]
  );

  const sensors: SensorChip[] = useMemo(() => {
    const camStatus =
      cameraState === "granted"
        ? "ok"
        : cameraState === "denied"
          ? "off"
          : cameraState === "prompt"
            ? "warn"
            : "off";
    const camDetail =
      cameraState === "granted"
        ? "Разрешена"
        : cameraState === "denied"
          ? "Нет доступа"
          : cameraState === "prompt"
            ? "Нужно разрешение"
            : "Не найдена";

    return [
      {
        id: "camera",
        label: "Камера",
        detail: camDetail,
        status: camStatus,
      },
      {
        id: "pose",
        label: "Поза · MediaPipe",
        detail: bodyDataLocked
          ? "Скелет зафиксирован на скане"
          : "Активна во время скана / тренировки",
        status: bodyDataLocked ? "ok" : cameraState === "granted" ? "warn" : "off",
      },
      {
        id: "twin",
        label: "Цифровой двойник",
        detail: bodyDataLocked
          ? `Состав · жир ${latchedBody?.fatPercent ?? "—"}%`
          : "Нужен биоскан",
        status: bodyDataLocked ? "live" : "off",
      },
      {
        id: "health",
        label: "Huawei Health",
        detail: healthConnected
          ? `Readiness ${healthReadiness?.score ?? "—"}%`
          : "Не подключен",
        status: healthConnected ? "ok" : "off",
      },
      {
        id: "ai",
        label: "Gemini AI",
        detail:
          geminiOk === null
            ? "Проверка…"
            : geminiOk
              ? "Онлайн"
              : "Локальный fallback",
        status: geminiOk === null ? "warn" : geminiOk ? "ok" : "warn",
      },
    ];
  }, [
    cameraState,
    bodyDataLocked,
    latchedBody,
    healthConnected,
    healthReadiness,
    geminiOk,
  ]);

  const startTraining = useCallback(
    (sport: Sport, exercise?: StrengthExercise) => {
      void goToTraining(sport, exercise);
    },
    []
  );

  const logWorkout = useCallback(() => {
    useAppStore.getState().ensureProfile();
    setFocusSportPicker(true);
    document
      .getElementById("dashboard-sport-picker")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [setFocusSportPicker]);

  const goToScan = useCallback(() => {
    if (bodyDataLocked) requestRescan();
    setPhase("calibration");
  }, [bodyDataLocked, requestRescan, setPhase]);

  const openTwinLive = useCallback(() => {
    if (!bodyDataLocked) {
      goToScan();
      return;
    }
    setPhase("twin-live");
  }, [bodyDataLocked, goToScan, setPhase]);

  const handleNav = (phase: AppPhase) => {
    if (phase === "calibration") {
      goToScan();
      return;
    }
    if (phase === "twin-live") {
      openTwinLive();
      return;
    }
    if (phase === "sport-select") {
      useAppStore.getState().ensureProfile();
      setFocusSportPicker(true);
      setPhase("sport-select");
      return;
    }
    setPhase(phase);
  };

  const userName = profile?.age ? `Атлет ${profile.age}` : "Атлет";
  const programLabel = `Железный протокол · Неделя ${overview.programWeek}`;

  const sportSelect = (
    <ApexSportSelect
      onSelect={startTraining}
      highlight={focusSportPicker}
    />
  );

  const twinScan = (
    <ApexTwinScanPanel
      bodyDataLocked={bodyDataLocked}
      latchedBody={latchedBody}
      lastSession={lastSession}
      sensors={sensors}
      onScan={goToScan}
      onOpenLive={bodyDataLocked ? openTwinLive : undefined}
    />
  );

  return (
    <motion.div
      className="min-h-dvh w-full bg-black pb-20 lg:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="lg:hidden px-4 py-6">
        <PwaInstallBanner />
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#737373]">
              {new Date().toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-white">
              Обзор
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToScan}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            >
              <AppIcon name="body" className="h-3.5 w-3.5" />
              Скан
            </button>
            <button
              type="button"
              onClick={logWorkout}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--neon-lime,#ccff00)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-black"
            >
              <AppIcon name="plus" className="h-3.5 w-3.5" />
              Тренировка
            </button>
          </div>
        </header>
        <ApexOverview
          overview={overview}
          sportSelect={sportSelect}
          twinScan={twinScan}
        />
      </div>

      <div className="hidden lg:block">
        <PwaInstallBanner />
        <DashboardShell
          userName={userName}
          programLabel={programLabel}
          overview={overview}
          twinLocked={bodyDataLocked}
          onNav={handleNav}
          onLogWorkout={logWorkout}
        >
          <ApexOverview
            overview={overview}
            sportSelect={sportSelect}
            twinScan={twinScan}
          />
        </DashboardShell>
      </div>
    </motion.div>
  );
}
