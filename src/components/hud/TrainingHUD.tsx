"use client";

import VitalsHUD from "@/components/hud/VitalsHUD";
import type { LiveKinematics, Sport, StrengthExercise } from "@/types";
import { exerciseLabel } from "@/lib/pose/exercises";

interface TrainingHUDProps {
  kinematics: LiveKinematics;
  sport: Sport;
  coachText: string;
  punchFlash: boolean;
  reps?: number;
  punches?: number;
  swings?: number;
  formScore?: number;
  exercise?: StrengthExercise | null;
  metricLabel: string;
  metricValue: string;
  metricUnit: string;
  elapsedSec: number;
  minimal?: boolean;
}

export default function TrainingHUD({
  kinematics,
  sport,
  coachText,
  punchFlash,
  reps = 0,
  punches = 0,
  swings = 0,
  formScore = 0,
  exercise,
  metricLabel,
  metricValue,
  metricUnit,
  elapsedSec,
  minimal,
}: TrainingHUDProps) {
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const timer = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <>
      {!minimal && <VitalsHUD kinematics={kinematics} sport={sport} />}

      <div className="absolute top-14 left-3 z-20 flex flex-col gap-2">
        <div className="health-card bg-white/95 px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wide text-muted">
            {metricLabel}
          </p>
          <p className="text-lg font-bold text-sky-600">
            {metricValue}
            <span className="ml-0.5 text-[10px] font-normal text-muted">
              {metricUnit}
            </span>
          </p>
        </div>
        {sport === "strength" && (
          <div className="health-card bg-white/95 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wide text-muted">
              Повторы
            </p>
            <p className="text-2xl font-bold text-emerald-600">{reps}</p>
          </div>
        )}
        {sport === "boxing" && (
          <div className="health-card bg-white/95 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wide text-muted">
              Удары
            </p>
            <p className="text-2xl font-bold text-orange-600">{punches}</p>
          </div>
        )}
        {sport === "tennis" && (
          <div className="health-card bg-white/95 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wide text-muted">
              Замахи
            </p>
            <p className="text-2xl font-bold text-emerald-600">{swings}</p>
          </div>
        )}
        {formScore > 0 && (
          <div className="health-card bg-white/95 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wide text-muted">
              Техника
            </p>
            <p className="text-lg font-bold text-violet-600">{formScore}%</p>
          </div>
        )}
      </div>

      <div className="absolute top-14 right-3 z-20">
        <div className="health-card bg-white/95 px-3 py-2 text-center backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wide text-muted">
            Время
          </p>
          <p className="font-mono text-lg font-bold text-slate-800">{timer}</p>
        </div>
      </div>

      {coachText && (
        <div className="absolute top-28 right-4 left-4 z-20">
          <div className="health-card mx-auto max-w-sm bg-white/95 px-4 py-3 text-center text-sm font-medium text-slate-700">
            🎙 {coachText}
          </div>
        </div>
      )}
      {punchFlash && kinematics.punchSpeedMs && (
        <div className="punch-flash absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-orange-500/90 px-6 py-3 text-white shadow-xl">
          <p className="text-xs uppercase tracking-widest">Удар</p>
          <p className="text-3xl font-bold">{kinematics.punchSpeedMs} м/с</p>
        </div>
      )}

      {exercise && (
        <p className="absolute top-4 left-4 z-30 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white">
          {exerciseLabel(exercise)}
        </p>
      )}
    </>
  );
}
