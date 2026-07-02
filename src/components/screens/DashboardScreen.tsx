"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import VelocityChart from "@/components/charts/VelocityChart";
import ProgressChart from "@/components/charts/ProgressChart";
import PwaInstallBanner from "@/components/pwa/PwaInstallBanner";
import DigitalTwinCard from "@/components/dashboard/DigitalTwinCard";
import MuscleReadinessCard from "@/components/dashboard/MuscleReadinessCard";
import AiPlanCard from "@/components/dashboard/AiPlanCard";
import { useAppStore } from "@/store/useAppStore";
import { computeMuscleReadiness } from "@/lib/readiness";
import { generateWorkoutPlan } from "@/lib/ai/workoutPlan";
import { exerciseLabel } from "@/lib/pose/exercises";
import { formScoreLabel } from "@/lib/pose/formScore";
import type { Sport, FitnessGoal } from "@/types";

const SPORT_NAMES: Record<Sport, string> = {
  strength: "Силовые",
  boxing: "Бокс",
  tennis: "Теннис",
};

const GOAL_NAMES: Record<FitnessGoal, string> = {
  lose_weight: "Похудение",
  gain_muscle: "Набор мышц",
  maintain: "Поддержание",
  performance: "Результат",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  return (
    <motion.div
      className="mx-auto min-h-dvh max-w-lg bg-gradient-to-b from-white to-cyan-50/30 px-5 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 text-xs font-black text-white">
              A
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-700">
                Atlant Hybrid
              </p>
              <h1 className="text-xl font-bold text-slate-900">Дашборд</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="atlant-hud-pill !py-1 !text-[9px] !text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              В сети
            </span>
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
          <p className="font-mono text-xs text-cyan-800/80">
            [ПРОФИЛЬ · {profile.height}см · {profile.weight}кг · {profile.age}л
            {profile.goal && GOAL_NAMES[profile.goal]
              ? ` · ${GOAL_NAMES[profile.goal]}`
              : ""}
            ]
          </p>
        )}
      </header>

      <PwaInstallBanner />

      <DigitalTwinCard
        bodyDataLocked={bodyDataLocked}
        latchedBody={latchedBody}
        onScan={goToScan}
        onOpenLive={
          bodyDataLocked ? () => setPhase("twin-live") : undefined
        }
      />

      <MuscleReadinessCard report={readiness} />

      {plan && (
        <AiPlanCard plan={plan} onStart={() => setPhase("sport-select")} />
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="atlant-metric-card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
            Жировая масса
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-500">
            {bodyDataLocked && latchedBody
              ? `${latchedBody.fatPercent}%`
              : "—"}
          </p>
          {bodyDataLocked && latchedBody && (
            <p className="text-[10px] text-amber-700/80">
              {latchedBody.fatMassKg} кг
            </p>
          )}
          {bodyDataLocked && (
            <p className="mt-1 font-mono text-[9px] text-emerald-600">[LOCKED]</p>
          )}
        </div>
        <div className="atlant-metric-card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            Мышечная масса
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-500">
            {bodyDataLocked && latchedBody
              ? `${latchedBody.musclePercent}%`
              : "—"}
          </p>
          {bodyDataLocked && (
            <p className="mt-1 font-mono text-[9px] text-emerald-600">[LOCKED]</p>
          )}
        </div>
      </div>

      {sessionHistory.length >= 2 && (
        <ProgressChart history={sessionHistory} />
      )}

      <div className="atlant-metric-card mb-4 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700">
          Мониторинг · VBT
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {bodyDataLocked
            ? "Пульс, скорость, мощность и усталость — во время тренировки"
            : "Тренировка доступна сразу. Скан тела — для цифрового двойника"}
        </p>
        {geminiOk !== null && (
          <p className="mt-2 font-mono text-[10px] text-slate-400">
            [GEMINI: {geminiOk ? "ONLINE" : "LOCAL FALLBACK"}]
          </p>
        )}
      </div>

      {lastSession && (
        <Card className="mb-4">
          <p className="text-xs font-medium text-primary">Последняя тренировка</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>
              {lastSession.exercise
                ? exerciseLabel(lastSession.exercise)
                : SPORT_NAMES[lastSession.sport]}
            </span>
            <span>{lastSession.durationSec} сек</span>
            <span>Ø {lastSession.avgVelocity} м/с</span>
            {lastSession.formScore != null && lastSession.formScore > 0 && (
              <span>
                Техника {lastSession.formScore}% (
                {formScoreLabel(lastSession.formScore)})
              </span>
            )}
            {lastSession.reps != null && lastSession.reps > 0 && (
              <span>{lastSession.reps} повт.</span>
            )}
            {lastSession.punches != null && lastSession.punches > 0 && (
              <span>{lastSession.punches} удар.</span>
            )}
            {lastSession.swings != null && lastSession.swings > 0 && (
              <span>{lastSession.swings} замах.</span>
            )}
          </div>
          <div className="mt-3">
            <VelocityChart samples={lastSession.samples} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {lastSession.aiAnalysis}
          </p>
        </Card>
      )}

      {sessionHistory.length > 1 && (
        <Card className="mb-4">
          <p className="mb-3 text-xs font-medium text-muted uppercase tracking-wide">
            История
          </p>
          <ul className="space-y-2">
            {sessionHistory.slice(1, 6).map((s, i) => (
              <li
                key={`${s.completedAt}-${i}`}
                className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0"
              >
                <span className="text-slate-700">
                  {s.exercise
                    ? exerciseLabel(s.exercise)
                    : SPORT_NAMES[s.sport]}
                  {s.reps ? ` · ${s.reps} повт.` : ""}
                  {s.punches ? ` · ${s.punches} уд.` : ""}
                  {s.swings ? ` · ${s.swings} зам.` : ""}
                  {s.formScore ? ` · ${s.formScore}%` : ""}
                </span>
                <span className="text-xs text-muted">
                  {formatDate(s.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        <Button size="lg" onClick={() => setPhase("sport-select")}>
          Начать тренировку
        </Button>
        <Button size="lg" variant="secondary" onClick={goToScan}>
          {bodyDataLocked ? "Пересканировать тело" : "Скан тела (опционально)"}
        </Button>
        {sessionHistory.length > 0 && (
          <Button size="lg" variant="ghost" onClick={exportData}>
            Экспорт данных {exportMsg && `· ${exportMsg}`}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
