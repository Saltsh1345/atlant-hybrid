"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import type { Sport, StrengthExercise } from "@/types";
import { usePositionCoach } from "@/hooks/usePositionCoach";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";
import { speakGuidance } from "@/lib/ai/speech";

const AUTO_START_SEC = 3;

interface SportSetupGateProps {
  sport: Sport;
  exercise?: StrengthExercise | null;
  landmarks: NormalizedLandmark[] | null;
  active: boolean;
  heightCm?: number;
  detectedHeightCm?: number | null;
  cameraCalibration?: CameraCalibration | null;
  onReady: () => void;
  onSkip?: () => void;
}

export default function SportSetupGate({
  sport,
  exercise,
  landmarks,
  active,
  heightCm,
  detectedHeightCm,
  cameraCalibration,
  onReady,
  onSkip,
}: SportSetupGateProps) {
  const context = useMemo(
    () =>
      active
        ? ({ mode: "sport_setup" as const, sport, exercise })
        : null,
    [active, sport, exercise]
  );

  const coach = usePositionCoach(
    landmarks,
    context,
    active,
    true,
    heightCm,
    cameraCalibration
  );
  const [autoSec, setAutoSec] = useState<number | null>(null);
  const firedRef = useRef(false);
  const autoSecRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      if (autoSecRef.current !== null) {
        autoSecRef.current = null;
        setAutoSec(null);
      }
    }
  }, [active]);

  useEffect(() => {
    if (!active || !coach.readyHeld || firedRef.current) {
      if (!coach.readyHeld && autoSecRef.current !== null) {
        autoSecRef.current = null;
        setAutoSec(null);
      }
      return;
    }

    autoSecRef.current = AUTO_START_SEC;
    setAutoSec(AUTO_START_SEC);
    speakGuidance(
      "setup:ready",
      "Позиция принята. Старт через три",
      { cooldownMs: 4000 }
    );

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let s = AUTO_START_SEC - 1; s >= 1; s--) {
      timers.push(
        setTimeout(() => {
          autoSecRef.current = s;
          setAutoSec(s);
          speakGuidance(`setup:count:${s}`, String(s), { cooldownMs: 800 });
        }, (AUTO_START_SEC - s) * 1000)
      );
    }
    timers.push(
      setTimeout(() => {
        firedRef.current = true;
        autoSecRef.current = null;
        setAutoSec(null);
        onReady();
      }, AUTO_START_SEC * 1000)
    );

    return () => timers.forEach(clearTimeout);
  }, [active, coach.readyHeld, onReady]);

  const sportTitle =
    sport === "boxing" ? "Бокс" : sport === "tennis" ? "Теннис" : "Силовые";

  return (
    <motion.div
      className="absolute inset-0 z-[45] flex flex-col items-center justify-end bg-black/55 px-4 pb-28 pt-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-4 max-w-sm rounded-2xl border border-white/20 bg-slate-900/90 px-4 py-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
          Шаг 0 · {sportTitle}
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Встаньте правильно</h3>
        <p className="mt-2 text-sm text-slate-300">{coach.hint}</p>
        {coach.metrics && (
          <p className="mt-1 text-xs text-cyan-300/90">{coach.metrics}</p>
        )}
        {detectedHeightCm && (
          <p className="mt-1 text-xs text-emerald-400">
            Рост (полный кадр): ~{detectedHeightCm} см
          </p>
        )}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full transition-all ${coach.readyHeld ? "bg-emerald-500" : "bg-cyan-500"}`}
            style={{ width: `${Math.round(coach.progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {coach.readyHeld && autoSec !== null
            ? `Старт автоматически через ${autoSec}… (руки свободны)`
            : coach.readyHeld
              ? "Запуск…"
              : "Двигайтесь по подсказкам — камера не ездит, двигаетесь вы"}
        </p>
      </div>

      {!coach.readyHeld && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button size="lg" variant="ghost" onClick={onReady}>
            Продолжить без проверки
          </Button>
          {onSkip && (
            <Button size="lg" variant="ghost" onClick={onSkip}>
              Пропустить настройку
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
