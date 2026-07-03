"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LiveKinematics, Sport, StrengthExercise } from "@/types";
import { exerciseLabel } from "@/lib/pose/exercises";

const REP_TARGET = 10;
const MOCK_PREVIEW = process.env.NEXT_PUBLIC_MOCK_HUD === "true";

function glassPanel(className = "") {
  return `rounded-2xl border border-cyan-500/25 bg-white/75 shadow-lg backdrop-blur-md ${className}`;
}

function punchLabel(type?: string): string {
  const map: Record<string, string> = {
    jab: "Джеб",
    cross: "Кросс",
    hook: "Хук",
    combo: "Комбо",
    forehand: "Форхенд",
    backhand: "Бэкхенд",
    serve: "Подача",
  };
  return type ? (map[type] ?? type) : "—";
}

interface SportHUDProps {
  sport: Sport;
  kinematics: LiveKinematics;
  exercise?: StrengthExercise | null;
  reps?: number;
  formScore?: number;
  elapsedSec?: number;
  coachText?: string;
  /** Boxing / tennis drill */
  strikeLabel?: string;
  strikeType?: string;
  lastStrikeSpeed?: number | null;
  strikeFlash?: boolean;
  useMock?: boolean;
}

function HudTimer({ elapsedSec = 0 }: { elapsedSec?: number }) {
  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  return (
    <div className={`${glassPanel()} px-3 py-2 text-center`}>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        Время
      </p>
      <p className="font-mono text-lg font-bold tabular-nums text-slate-800">
        {m}:{s.toString().padStart(2, "0")}
      </p>
    </div>
  );
}

function StrengthHUD({
  kinematics,
  exercise,
  reps = 0,
  formScore = 0,
  elapsedSec,
  coachText,
  mock,
}: {
  kinematics: LiveKinematics;
  exercise?: StrengthExercise | null;
  reps?: number;
  formScore?: number;
  elapsedSec?: number;
  coachText?: string;
  mock?: boolean;
}) {
  const velocity = mock ? 0.82 : kinematics.velocityMs;
  const fatigue = mock ? 28 : kinematics.fatiguePercent;
  const jointAngle =
    mock && !exercise
      ? 112
      : exercise === "bench"
        ? kinematics.elbowAngle
        : kinematics.kneeAngle;
  const lowVbt = velocity < 0.4 && velocity > 0.05;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className={`${glassPanel()} flex-1 px-4 py-3`}>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-cyan-700">
            {exercise ? exerciseLabel(exercise) : "Силовые"} · VBT
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase text-slate-500">Повторения</p>
              <p className="font-mono text-4xl font-black tabular-nums text-slate-900">
                {reps}
                <span className="text-lg font-semibold text-slate-400">
                  /{REP_TARGET}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase text-slate-500">Скорость VBT</p>
              <motion.p
                className={`font-mono text-2xl font-bold tabular-nums ${
                  lowVbt ? "text-red-500" : "text-emerald-600"
                }`}
                animate={lowVbt ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
                transition={
                  lowVbt
                    ? { repeat: Infinity, duration: 0.9 }
                    : { duration: 0.2 }
                }
              >
                {velocity.toFixed(2)}
                <span className="text-sm font-medium text-slate-500"> м/с</span>
              </motion.p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-cyan-200/50 bg-cyan-50/50 px-2 py-1.5">
              <p className="text-[8px] uppercase text-cyan-800">Угол сустава</p>
              <p className="font-mono text-xl font-bold tabular-nums text-cyan-900">
                {Math.round(jointAngle)}°
              </p>
            </div>
            <div className="rounded-xl border border-violet-200/50 bg-violet-50/40 px-2 py-1.5">
              <p className="text-[8px] uppercase text-violet-800">Техника</p>
              <p className="font-mono text-xl font-bold tabular-nums text-violet-900">
                {formScore}%
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[8px] uppercase text-slate-500">
              <span>Усталость</span>
              <span className="tabular-nums">{Math.round(fatigue)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={`h-full rounded-full transition-all ${
                  fatigue > 55
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-gradient-to-r from-cyan-400 to-emerald-500"
                }`}
                style={{ width: `${Math.min(100, fatigue)}%` }}
              />
            </div>
          </div>
        </div>
        <HudTimer elapsedSec={elapsedSec} />
      </div>
      {coachText && (
        <div className={`${glassPanel()} px-3 py-2 text-center text-xs text-slate-700`}>
          🎙 {coachText}
        </div>
      )}
    </div>
  );
}

function BoxingHUD({
  kinematics,
  formScore = 0,
  elapsedSec,
  strikeLabel,
  strikeType,
  lastStrikeSpeed,
  strikeFlash,
  mock,
}: {
  kinematics: LiveKinematics;
  formScore?: number;
  elapsedSec?: number;
  strikeLabel?: string;
  strikeType?: string;
  lastStrikeSpeed?: number | null;
  strikeFlash?: boolean;
  mock?: boolean;
}) {
  const wrist = mock ? 1.65 : kinematics.wristVelocityMs;
  const displaySpeed = lastStrikeSpeed ?? wrist;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30">
      <div className={`${glassPanel()} px-4 py-3`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-orange-600">
              Бокс · Drill HUD
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {strikeLabel ?? "Ожидание команды"}
            </p>
            <p className="font-mono text-xs text-cyan-700">
              Тип: {punchLabel(strikeType)}
            </p>
          </div>
          <HudTimer elapsedSec={elapsedSec} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-cyan-200/60 bg-white/60 px-2 py-2">
            <p className="text-[8px] uppercase text-slate-500">Запястье live</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-cyan-600">
              {wrist.toFixed(2)}
              <span className="text-xs text-slate-400"> м/с</span>
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-2 py-2">
            <p className="text-[8px] uppercase text-emerald-800">Точность / форма</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-emerald-700">
              {formScore}%
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(strikeFlash || (mock && MOCK_PREVIEW)) && (
          <motion.div
            key={displaySpeed}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.35 }}
            className="absolute top-1/2 left-1/2 z-40 -translate-x-1/2 -translate-y-1/3 rounded-2xl border border-cyan-400/50 bg-cyan-500/15 px-8 py-4 text-center shadow-[0_0_40px_rgba(6,182,212,0.35)] backdrop-blur-md"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-700">
              Скорость выброса
            </p>
            <p className="font-mono text-5xl font-black tabular-nums text-cyan-500 drop-shadow-sm">
              {(mock ? 2.14 : displaySpeed).toFixed(2)}
            </p>
            <p className="text-sm font-medium text-slate-600">м/с</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TennisArcGauge({
  value,
  max,
  label,
  ok,
}: {
  value: number;
  max: number;
  label: string;
  ok: boolean;
}) {
  const pct = Math.min(1, value / max);
  const angle = -90 + pct * 180;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="h-16 w-28">
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={ok ? "#10b981" : "#f97316"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${pct * 157} 157`}
        />
        <line
          x1="60"
          y1="60"
          x2={60 + 38 * Math.cos((angle * Math.PI) / 180)}
          y2={60 + 38 * Math.sin((angle * Math.PI) / 180)}
          stroke="#06b6d4"
          strokeWidth="2"
        />
      </svg>
      <p className="text-[8px] uppercase text-slate-500">{label}</p>
      <p
        className={`font-mono text-lg font-bold tabular-nums ${ok ? "text-emerald-600" : "text-orange-600"}`}
      >
        {value.toFixed(1)}
      </p>
    </div>
  );
}

function TennisHUD({
  kinematics,
  formScore = 0,
  elapsedSec,
  strikeLabel,
  strikeType,
  lastStrikeSpeed,
  strikeFlash,
  mock,
}: {
  kinematics: LiveKinematics;
  formScore?: number;
  elapsedSec?: number;
  strikeLabel?: string;
  strikeType?: string;
  lastStrikeSpeed?: number | null;
  strikeFlash?: boolean;
  mock?: boolean;
}) {
  const swing = mock ? 2.05 : kinematics.wristVelocityMs;
  const spine = mock ? 18 : kinematics.spineFlexion;
  const postureOk = spine >= 6 && spine <= 45;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30">
      <div className={`${glassPanel()} px-4 py-3`}>
        <div className="flex justify-between gap-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-700">
              Теннис · Swing HUD
            </p>
            <p className="text-sm font-bold text-slate-900">
              {strikeLabel ?? "Замах"}
            </p>
            <p className="font-mono text-xs text-cyan-700">
              {punchLabel(strikeType)}
            </p>
          </div>
          <HudTimer elapsedSec={elapsedSec} />
        </div>

        <div className="mt-3 flex items-center justify-around gap-2">
          <TennisArcGauge value={swing} max={3.5} label="Скорость замаха" ok />
          <div className="text-center">
            <p className="text-[8px] uppercase text-slate-500">Баланс оси</p>
            <div
              className={`mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                postureOk
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                  : "border-orange-500 bg-orange-50 text-orange-600"
              }`}
            >
              <span className="text-lg">{postureOk ? "✓" : "!"}</span>
            </div>
            <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
              {Math.round(spine)}°
            </p>
          </div>
          <TennisArcGauge value={formScore} max={100} label="Форма %" ok={formScore >= 50} />
        </div>
      </div>

      <AnimatePresence>
        {strikeFlash && lastStrikeSpeed != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-32 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-emerald-300/50 bg-emerald-500/10 px-6 py-2 backdrop-blur-md"
          >
            <p className="font-mono text-3xl font-black tabular-nums text-emerald-600">
              {lastStrikeSpeed.toFixed(2)} м/с
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SportHUD(props: SportHUDProps) {
  const mock = props.useMock ?? MOCK_PREVIEW;

  if (props.sport === "strength") {
    return (
      <StrengthHUD
        kinematics={props.kinematics}
        exercise={props.exercise}
        reps={props.reps}
        formScore={props.formScore}
        elapsedSec={props.elapsedSec}
        coachText={props.coachText}
        mock={mock}
      />
    );
  }

  if (props.sport === "boxing") {
    return (
      <BoxingHUD
        kinematics={props.kinematics}
        formScore={props.formScore}
        elapsedSec={props.elapsedSec}
        strikeLabel={props.strikeLabel}
        strikeType={props.strikeType}
        lastStrikeSpeed={props.lastStrikeSpeed}
        strikeFlash={props.strikeFlash}
        mock={mock}
      />
    );
  }

  return (
    <TennisHUD
      kinematics={props.kinematics}
      formScore={props.formScore}
      elapsedSec={props.elapsedSec}
      strikeLabel={props.strikeLabel}
      strikeType={props.strikeType}
      lastStrikeSpeed={props.lastStrikeSpeed}
      strikeFlash={props.strikeFlash}
      mock={mock}
    />
  );
}
