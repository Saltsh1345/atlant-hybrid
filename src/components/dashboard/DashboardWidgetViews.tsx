"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DashboardSportPicker from "@/components/dashboard/DashboardSportPicker";
import DigitalTwinCard from "@/components/dashboard/DigitalTwinCard";
import MuscleReadinessCard from "@/components/dashboard/MuscleReadinessCard";
import AiPlanCard from "@/components/dashboard/AiPlanCard";
import ProgressChart from "@/components/charts/ProgressChart";
import VelocityChart from "@/components/charts/VelocityChart";
import { exerciseLabel } from "@/lib/pose/exercises";
import { formScoreLabel } from "@/lib/pose/formScore";
import type { DashboardWidgetContext } from "@/components/dashboard/DashboardWidgets";
import type { DashboardWidgetId } from "@/lib/dashboard/widgets";
import type { SessionSummary, Sport, StrengthExercise } from "@/types";

const SPORT_NAMES: Record<Sport, string> = {
  strength: "Силовые",
  boxing: "Бокс",
  tennis: "Теннис",
};

function weekBars(history: SessionSummary[]) {
  const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const now = new Date();
  return labels.map((label, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const sessions = history.filter((s) => {
      const t = new Date(s.completedAt);
      return t >= d && t < next;
    });
    const mins = Math.round(
      sessions.reduce((a, s) => a + s.durationSec, 0) / 60
    );
    return { label, mins };
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StepsRing({ value }: { value: number }) {
  const pct = Math.min(100, (value / 8000) * 100);
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex h-full flex-col items-center justify-center py-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e8edf4" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#2b9fff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="48" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e293b">
          {value > 9999 ? `${Math.round(value / 1000)}k` : value}
        </text>
      </svg>
      <p className="text-[10px] text-slate-500">ед. активности</p>
    </div>
  );
}

function ArcLoad({ value, label }: { value: number; label: string }) {
  const pct = value / 100;
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg width="110" height="62" viewBox="0 0 110 62">
        <path d="M 10 52 A 45 45 0 0 1 100 52" fill="none" stroke="#e8edf4" strokeWidth="9" />
        <path
          d="M 10 52 A 45 45 0 0 1 100 52"
          fill="none"
          stroke="#2b9fff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${pct * 141} 141`}
        />
        <text x="55" y="48" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1e293b">
          {value}
        </text>
      </svg>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

export function renderDashboardWidget(
  id: DashboardWidgetId,
  ctx: DashboardWidgetContext,
  extras: {
    onSelectSport: (sport: Sport, exercise?: StrengthExercise) => void;
    highlightSport?: boolean;
  }
): ReactNode {
  const week = weekBars(ctx.sessionHistory);
  const weekMins = week.reduce((a, d) => a + d.mins, 0);

  const reps =
    (ctx.lastSession?.reps ?? 0) +
    (ctx.lastSession?.punches ?? 0) +
    (ctx.lastSession?.swings ?? 0);
  const steps = reps > 0 ? reps * 130 : Math.min(8000, weekMins * 85 + 1200);

  const pulseData =
    ctx.lastSession?.samples.map((s, i) => ({
      t: i,
      v: Math.round((s.velocityMs * 35 + 70) * 10) / 10,
    })) ?? [];

  const weight = ctx.profile?.weight ?? 75;
  const height = ctx.profile?.height ?? 175;
  const bmi = Math.round((weight / (height / 100) ** 2) * 10) / 10;

  const recoveryH = ctx.lastSession
    ? Math.round(
        (Date.now() - new Date(ctx.lastSession.completedAt).getTime()) / 3_600_000
      )
    : 24;

  const hydrationPct = Math.min(
    100,
    Math.round(40 + weekMins * 2.5 + (ctx.readiness.overall || 50) * 0.3)
  );
  const waterBars = [0.25, 0.4, 0.55, 0.7, 0.85, 0.65, 0.9, hydrationPct / 100];

  switch (id) {
    case "sport-picker":
      return <DashboardSportPicker highlight={extras.highlightSport} />;

    case "activity":
      return (
        <div className="flex h-full flex-col rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 p-4 text-white">
          <h3 className="text-sm font-semibold">Активность</h3>
          <p className="mb-2 text-[10px] text-white/80">Текущая неделя · {weekMins} мин</p>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ left: -28, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.9)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} мин`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="mins" fill="rgba(255,255,255,0.9)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );

    case "steps":
      return <StepsRing value={steps} />;

    case "load":
      return (
        <ArcLoad
          value={ctx.readiness.overall || 36}
          label={ctx.readiness.label || "В норме"}
        />
      );

    case "pulse":
      return (
        <div className="flex h-full flex-col p-1">
          <p className="mb-1 text-xs font-semibold text-slate-700">Пульс / VBT</p>
          {pulseData.length > 1 ? (
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pulseData}>
                  <defs>
                    <linearGradient id="vbtFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2b9fff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2b9fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="v" stroke="#2b9fff" fill="url(#vbtFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center text-xs text-slate-400">
              Пройдите тренировку для графика VBT
            </p>
          )}
        </div>
      );

    case "water":
      return (
        <div className="flex h-full flex-col p-1">
          <p className="text-xs font-semibold text-slate-700">Гидратация</p>
          <div className="mt-2 flex flex-1 items-end gap-1">
            {waterBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-sky-500 to-sky-300"
                style={{ height: `${Math.max(12, h * 100)}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-sm font-bold text-slate-800">
            {(hydrationPct / 62).toFixed(1)} л экв.
          </p>
        </div>
      );

    case "sleep":
      return (
        <div className="flex h-full flex-col p-1">
          <p className="text-xs font-semibold text-slate-700">Восстановление</p>
          <p className="text-2xl font-bold text-slate-900">
            {Math.max(5.5, 9.2 - recoveryH * 0.08).toFixed(1)} ч
          </p>
          <p className="text-[10px] text-slate-500">сна экв. · отдых {recoveryH}ч</p>
          <div className="mt-2 flex flex-1 items-end gap-0.5">
            {[1, 2.5, 4, 3, 2, 1.2].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-violet-300"
                style={{ height: `${h * 16}%` }}
              />
            ))}
          </div>
        </div>
      );

    case "macros":
      return (
        <div className="h-full overflow-auto p-1">
          <p className="mb-2 text-xs font-semibold text-slate-700">Состав тела · ИМТ {bmi}</p>
          {[
            { n: "Жир", v: ctx.latchedBody?.fatPercent ?? "—", p: ctx.latchedBody?.fatPercent ?? 0, c: "bg-amber-400" },
            { n: "Мышцы", v: ctx.latchedBody?.musclePercent ?? "—", p: ctx.latchedBody?.musclePercent ?? 0, c: "bg-emerald-400" },
            { n: "Сухая масса", v: ctx.latchedBody ? `${ctx.latchedBody.leanMassKg} кг` : "—", p: ctx.latchedBody ? Math.min(100, ctx.latchedBody.leanMassKg) : 0, c: "bg-sky-400" },
          ].map((row) => (
            <div key={row.n} className="mb-2">
              <div className="flex justify-between text-[10px]">
                <span>{row.n}</span>
                <span className="font-mono">{typeof row.v === "number" ? `${row.v}%` : row.v}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${row.c}`} style={{ width: `${row.p}%` }} />
              </div>
            </div>
          ))}
          {!ctx.bodyDataLocked && (
            <Button size="md" variant="secondary" className="mt-2 !w-full" onClick={ctx.onScan}>
              Скан тела
            </Button>
          )}
        </div>
      );

    case "run":
      return (
        <div className="flex h-full flex-col justify-center p-2">
          <p className="text-xs font-semibold text-slate-700">Дистанция</p>
          <p className="text-xl font-bold text-slate-900">
            {ctx.lastSession
              ? `${(ctx.lastSession.durationSec / 60 / 6).toFixed(2)} км`
              : "—"}
          </p>
          <svg viewBox="0 0 80 36" className="mt-2 h-8 w-full text-sky-400">
            <path d="M6 28 Q30 6 50 18 T74 10" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      );

    case "twin":
      return (
        <DigitalTwinCard
          bodyDataLocked={ctx.bodyDataLocked}
          latchedBody={ctx.latchedBody}
          onScan={ctx.onScan}
          onOpenLive={ctx.onTwinLive}
          className="h-full !border-0 !bg-transparent !shadow-none"
        />
      );

    case "readiness":
      return <MuscleReadinessCard report={ctx.readiness} className="h-full !border-0 !shadow-none" />;

    case "plan":
      return ctx.plan ? (
        <AiPlanCard
          plan={ctx.plan}
          onStart={() => {
            const focus = ctx.plan?.focus;
            if (focus === "strength") {
              extras.onSelectSport(
                "strength",
                ctx.lastSession?.exercise ?? "squat"
              );
            } else if (focus === "boxing" || focus === "tennis") {
              extras.onSelectSport(focus);
            } else {
              extras.onSelectSport(ctx.lastSession?.sport ?? "boxing");
            }
          }}
          className="h-full !shadow-none"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-500">
          Заполните профиль в настройках
        </div>
      );

    case "monitoring":
      return (
        <div className="flex h-full flex-col justify-center p-3">
          <p className="text-xs font-semibold text-cyan-700">VBT · Gemini</p>
          <p className="mt-2 text-sm text-slate-600">
            {ctx.geminiOk ? "ИИ-анализ онлайн" : "Локальный fallback"}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {ctx.bodyDataLocked ? "Двойник зафиксирован" : "Скан не обязателен"}
          </p>
        </div>
      );

    case "body-metrics":
      return ctx.showBodyTiles ? (
        <div className="grid h-full grid-cols-2 gap-2 p-2">
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-[10px] text-amber-700">Жир</p>
            <p className="text-xl font-bold text-amber-500">—</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-[10px] text-emerald-700">Мышцы</p>
            <p className="text-xl font-bold text-emerald-500">—</p>
          </div>
        </div>
      ) : (
        <p className="flex h-full items-center justify-center text-xs text-slate-400">Данные после скана</p>
      );

    case "progress":
      return ctx.sessionHistory.length >= 2 ? (
        <ProgressChart history={ctx.sessionHistory} />
      ) : (
        <p className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-400">
          Нужно минимум 2 тренировки для графика прогресса
        </p>
      );

    case "last-session":
      return ctx.lastSession ? (
        <Card className="h-full overflow-auto !border-0 !shadow-none md:p-3">
          <p className="text-xs font-medium text-primary">Последняя тренировка</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>
              {ctx.lastSession.exercise
                ? exerciseLabel(ctx.lastSession.exercise)
                : SPORT_NAMES[ctx.lastSession.sport]}
            </span>
            <span>{ctx.lastSession.durationSec} сек</span>
            <span>Ø {ctx.lastSession.avgVelocity} м/с</span>
            {ctx.lastSession.formScore != null && ctx.lastSession.formScore > 0 && (
              <span>
                {formScoreLabel(ctx.lastSession.formScore)} {ctx.lastSession.formScore}%
              </span>
            )}
          </div>
          <div className="mt-2 h-20">
            <VelocityChart samples={ctx.lastSession.samples} height={80} />
          </div>
          <p className="mt-2 line-clamp-4 text-xs text-slate-600">
            {ctx.lastSession.aiAnalysis}
          </p>
        </Card>
      ) : (
        <p className="flex h-full items-center justify-center text-xs text-slate-400">
          Выберите тренировку выше
        </p>
      );

    case "history":
      return ctx.sessionHistory.length > 0 ? (
        <Card className="h-full overflow-auto !border-0 !shadow-none md:p-3">
          <ul className="space-y-2">
            {ctx.sessionHistory.slice(0, 8).map((s, i) => (
              <li key={`${s.completedAt}-${i}`} className="flex justify-between gap-2 border-b border-slate-100 pb-2 text-xs last:border-0">
                <span className="text-slate-700">
                  {s.exercise ? exerciseLabel(s.exercise) : SPORT_NAMES[s.sport]}
                  {s.formScore ? ` · ${s.formScore}%` : ""}
                </span>
                <span className="shrink-0 text-slate-400">{formatDate(s.completedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="flex h-full items-center justify-center text-xs text-slate-400">
          История пуста
        </p>
      );

    case "actions":
      return (
        <div className="flex h-full flex-col justify-center gap-2 p-2">
          <Button size="md" onClick={() => extras.onSelectSport("boxing")}>
            Быстрый старт
          </Button>
          <Button size="md" variant="secondary" onClick={ctx.onScan}>
            {ctx.bodyDataLocked ? "Перескан" : "Скан тела"}
          </Button>
          {ctx.sessionHistory.length > 0 && (
            <Button size="md" variant="ghost" onClick={ctx.exportData}>
              Экспорт {ctx.exportMsg && `· ${ctx.exportMsg}`}
            </Button>
          )}
        </div>
      );

    default:
      return null;
  }
}
