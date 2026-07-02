"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SessionStats from "@/components/analysis/SessionStats";
import VelocityChart from "@/components/charts/VelocityChart";
import { useAppStore } from "@/store/useAppStore";
import { speak } from "@/lib/ai/speech";
import { getPeakPunchSpeed, getPeakVelocity } from "@/lib/pose/vbt";
import { getRepCount, getPunchCount, getSwingCount } from "@/lib/pose/repCounter";
import { getDrillFixations, drillSummary } from "@/lib/training/drillResults";
import { getAvgFormScore } from "@/lib/pose/formScore";

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState("");
  const [source, setSource] = useState<"gemini" | "fallback">("fallback");
  const [analysisReason, setAnalysisReason] = useState<string>("");
  const endedRef = useRef(false);

  const selectedSport = useAppStore((s) => s.selectedSport)!;
  const selectedExercise = useAppStore((s) => s.selectedExercise);
  const sessionSamples = useAppStore((s) => s.sessionSamples);
  const sessionStartTime = useAppStore((s) => s.sessionStartTime);
  const kinematics = useAppStore((s) => s.kinematics);
  const endSession = useAppStore((s) => s.endSession);
  const setPhase = useAppStore((s) => s.setPhase);

  const velocities = sessionSamples.map((s) => s.velocityMs);
  const avgVelocity =
    velocities.length > 0
      ? Math.round(
          (velocities.reduce((a, b) => a + b, 0) / velocities.length) * 100
        ) / 100
      : 0;
  const durationSec = sessionStartTime
    ? Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000))
    : 1;
  const formScore = getAvgFormScore();
  const peakVelocity = getPeakVelocity();
  const reps = selectedSport === "strength" ? getRepCount() : undefined;
  const drillFixations = getDrillFixations();
  const drillStats = drillSummary();
  const punches =
    selectedSport === "boxing"
      ? drillFixations.length > 0
        ? drillStats.fixed
        : getPunchCount()
      : undefined;
  const swings =
    selectedSport === "tennis"
      ? drillFixations.length > 0
        ? drillStats.fixed
        : getSwingCount()
      : undefined;

  useEffect(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    const stats = {
      reps,
      punches,
      swings,
      formScore,
      peakVelocity,
    };

    (async () => {
      try {
        const res = await fetch("/api/gemini/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport: selectedSport,
            exercise: selectedExercise,
            durationSec,
            avgVelocity,
            peakPunchSpeed: getPeakPunchSpeed(),
            peakVelocity,
            fatigue: kinematics.fatiguePercent,
            formScore,
            reps,
            punches,
            swings,
            drillFixations: drillFixations.map((f) => ({
              commandText: f.commandText,
              type: f.type,
              speedMs: f.speedMs,
              accuracy: f.accuracy,
              fixed: f.fixed,
            })),
          }),
        });
        const data = await res.json();
        const text =
          data.analysis ??
          "Отличная тренировка! Продолжайте в том же духе.";
        setSource(data.source === "gemini" ? "gemini" : "fallback");
        setAnalysisReason(
          typeof data.reason === "string" && data.reason ? data.reason : ""
        );
        setAnalysis(text);
        endSession(text, stats);
        speak(text);
      } catch {
        const fallback =
          "Отличная работа! Вы показали стабильную технику. Продолжайте тренироваться регулярно.";
        setAnalysis(fallback);
        endSession(fallback, stats);
        speak(fallback);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    selectedSport,
    selectedExercise,
    durationSec,
    avgVelocity,
    formScore,
    peakVelocity,
    reps,
    punches,
    swings,
    kinematics.fatiguePercent,
    endSession,
  ]);

  return (
    <motion.div
      className="mx-auto min-h-dvh max-w-lg px-5 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="mb-6 text-2xl font-bold">Анализ тренировки</h2>
      {!loading && (
        <p
          className={`mb-3 text-xs ${
            source === "gemini" ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          Источник анализа: {source === "gemini" ? "Gemini AI" : "Fallback"}
        </p>
      )}

      <SessionStats
        sport={selectedSport}
        exercise={selectedExercise}
        durationSec={durationSec}
        avgVelocity={avgVelocity}
        peakVelocity={peakVelocity}
        formScore={formScore}
        fatigue={kinematics.fatiguePercent}
        reps={reps}
        punches={punches}
        swings={swings}
      />

      {sessionSamples.length > 1 && (
        <Card className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Скорость VBT
          </p>
          <VelocityChart samples={sessionSamples} height={100} />
        </Card>
      )}

      {drillFixations.length > 0 && (
        <Card className="mb-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Фиксация ударов
          </p>
          <ul className="space-y-2 text-sm">
            {drillFixations.map((f, i) => (
              <li
                key={`${f.commandId}-${i}`}
                className="flex justify-between gap-2 border-b border-slate-100 pb-2"
              >
                <span>{f.commandText}</span>
                <span
                  className={
                    f.fixed ? "text-emerald-600" : "text-amber-600"
                  }
                >
                  {f.speedMs > 0
                    ? `${f.speedMs} м/с · ${f.accuracy}%`
                    : "пропуск"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Средняя скорость: {drillStats.avgSpeed} м/с · точность:{" "}
            {drillStats.avgAccuracy}%
          </p>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="space-y-3 py-6">
            <div className="h-4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <p className="text-center text-sm text-muted">
              Анализ VBT-данных...
            </p>
          </div>
        ) : (
          <>
            <p className="leading-relaxed text-slate-700">🎙 {analysis}</p>
            <p className="mt-3 text-[10px] text-muted">
              {source === "gemini"
                ? "Анализ от Gemini AI"
                : "Локальный анализ (Gemini недоступен)"}
            </p>
            {source === "fallback" && analysisReason && (
              <p className="mt-1 text-[10px] text-amber-700">
                Причина fallback: {analysisReason}
              </p>
            )}
          </>
        )}
      </Card>

      {!loading && (
        <div className="mt-6 space-y-3">
          <Button size="lg" onClick={() => setPhase("sport-select")}>
            Ещё тренировка
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setPhase("dashboard")}
          >
            На дашборд
          </Button>
        </div>
      )}
    </motion.div>
  );
}
