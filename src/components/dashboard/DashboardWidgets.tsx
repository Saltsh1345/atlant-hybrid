"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import VelocityChart from "@/components/charts/VelocityChart";
import ProgressChart from "@/components/charts/ProgressChart";
import DigitalTwinCard from "@/components/dashboard/DigitalTwinCard";
import MuscleReadinessCard from "@/components/dashboard/MuscleReadinessCard";
import AiPlanCard from "@/components/dashboard/AiPlanCard";
import { exerciseLabel } from "@/lib/pose/exercises";
import { formScoreLabel } from "@/lib/pose/formScore";
import type { DashboardWidgetId } from "@/lib/dashboard/widgets";
import type { ReadinessReport } from "@/lib/readiness";
import type { WorkoutPlan } from "@/lib/ai/workoutPlan";
import type { LatchedBodyData, SessionSummary, Sport } from "@/types";

const SPORT_NAMES: Record<Sport, string> = {
  strength: "Силовые",
  boxing: "Бокс",
  tennis: "Теннис",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BodyMetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "amber" | "emerald";
}) {
  const colors =
    tone === "amber"
      ? {
          label: "text-amber-600",
          value: "text-amber-500",
          sub: "text-amber-700/80",
        }
      : {
          label: "text-emerald-600",
          value: "text-emerald-500",
          sub: "text-emerald-700/80",
        };

  return (
    <div className="atlant-metric-card h-full p-4 text-center md:p-5">
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${colors.label}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${colors.value}`}
      >
        {value}
      </p>
      {sub && <p className={`text-[10px] ${colors.sub}`}>{sub}</p>}
    </div>
  );
}

function MonitoringCard({
  bodyDataLocked,
  geminiOk,
}: {
  bodyDataLocked: boolean;
  geminiOk: boolean | null;
}) {
  return (
    <div className="atlant-metric-card h-full p-4 md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700">
        Мониторинг · VBT
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
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
  );
}

export interface DashboardWidgetContext {
  bodyDataLocked: boolean;
  latchedBody: LatchedBodyData | null;
  readiness: ReadinessReport;
  plan: WorkoutPlan | null;
  geminiOk: boolean | null;
  lastSession: SessionSummary | null;
  sessionHistory: SessionSummary[];
  showBodyTiles: boolean;
  onScan: () => void;
  onTraining: () => void;
  onTwinLive?: () => void;
  exportData: () => void;
  exportMsg: string;
}

export function buildDashboardWidgets(ctx: DashboardWidgetContext): {
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
  availableToAdd: DashboardWidgetId[];
} {
  const availableToAdd: DashboardWidgetId[] = [
    "twin",
    "readiness",
    "plan",
    "monitoring",
    "actions",
    "progress",
    "last-session",
    "history",
  ];

  if (ctx.showBodyTiles) {
    availableToAdd.push("body-metrics");
  }

  const widgets: Partial<Record<DashboardWidgetId, ReactNode>> = {
    twin: (
      <DigitalTwinCard
        bodyDataLocked={ctx.bodyDataLocked}
        latchedBody={ctx.latchedBody}
        onScan={ctx.onScan}
        onOpenLive={ctx.onTwinLive}
        className="min-h-[280px] !shadow-none"
      />
    ),
    readiness: <MuscleReadinessCard report={ctx.readiness} className="h-full" />,
    plan: ctx.plan ? (
      <AiPlanCard
        plan={ctx.plan}
        onStart={ctx.onTraining}
        className="h-full !shadow-none"
      />
    ) : (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-500">
        Заполните профиль для персонального плана
      </div>
    ),
    monitoring: (
      <MonitoringCard
        bodyDataLocked={ctx.bodyDataLocked}
        geminiOk={ctx.geminiOk}
      />
    ),
    actions: (
      <div className="flex h-full flex-col justify-center gap-2 p-2">
        <Button size="lg" onClick={ctx.onTraining}>
          Начать тренировку
        </Button>
        <Button size="lg" variant="secondary" onClick={ctx.onScan}>
          {ctx.bodyDataLocked ? "Пересканировать тело" : "Скан тела"}
        </Button>
        {ctx.sessionHistory.length > 0 && (
          <Button size="md" variant="ghost" onClick={ctx.exportData}>
            Экспорт {ctx.exportMsg && `· ${ctx.exportMsg}`}
          </Button>
        )}
      </div>
    ),
    "body-metrics": ctx.showBodyTiles ? (
      <div className="grid h-full grid-cols-2 gap-2 p-1">
        <BodyMetricTile label="Жировая масса" value="—" tone="amber" />
        <BodyMetricTile label="Мышечная масса" value="—" tone="emerald" />
      </div>
    ) : null,
    progress:
      ctx.sessionHistory.length >= 2 ? (
        <ProgressChart history={ctx.sessionHistory} />
      ) : null,
    "last-session": ctx.lastSession ? (
      <Card className="h-full !shadow-none md:p-4">
        <p className="text-xs font-medium text-primary">Последняя тренировка</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>
            {ctx.lastSession.exercise
              ? exerciseLabel(ctx.lastSession.exercise)
              : SPORT_NAMES[ctx.lastSession.sport]}
          </span>
          <span>{ctx.lastSession.durationSec} сек</span>
          <span>Ø {ctx.lastSession.avgVelocity} м/с</span>
          {ctx.lastSession.formScore != null && ctx.lastSession.formScore > 0 && (
            <span>
              Техника {ctx.lastSession.formScore}% (
              {formScoreLabel(ctx.lastSession.formScore)})
            </span>
          )}
        </div>
        <div className="mt-2 min-h-[80px]">
          <VelocityChart samples={ctx.lastSession.samples} height={100} />
        </div>
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600">
          {ctx.lastSession.aiAnalysis}
        </p>
      </Card>
    ) : null,
    history:
      ctx.sessionHistory.length > 1 ? (
        <Card className="h-full !shadow-none md:p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            История
          </p>
          <ul className="space-y-2">
            {ctx.sessionHistory.slice(1, 7).map((s, i) => (
              <li
                key={`${s.completedAt}-${i}`}
                className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0"
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
                <span className="shrink-0 text-xs text-muted">
                  {formatDate(s.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null,
  };

  return { widgets, availableToAdd };
}

export function DashboardMobileLayout({
  ctx,
}: {
  ctx: DashboardWidgetContext;
}) {
  const { widgets } = buildDashboardWidgets(ctx);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <section className="flex flex-col gap-4 md:col-span-1">
          {widgets.twin}
          {ctx.showBodyTiles && widgets["body-metrics"]}
        </section>
        <aside className="flex flex-col gap-4 md:col-span-1">
          {widgets.readiness}
          {widgets.plan}
          {widgets.monitoring}
        </aside>
      </div>

      {(ctx.sessionHistory.length >= 2 || ctx.lastSession) && (
        <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-2">
          {widgets.progress}
          {widgets["last-session"]}
        </div>
      )}

      {widgets.history && <div className="mt-4 md:mt-6">{widgets.history}</div>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={ctx.onTraining}>
          Начать тренировку
        </Button>
        <Button size="lg" variant="secondary" onClick={ctx.onScan}>
          {ctx.bodyDataLocked ? "Пересканировать тело" : "Скан тела (опционально)"}
        </Button>
        {ctx.sessionHistory.length > 0 && (
          <Button
            size="lg"
            variant="ghost"
            className="sm:col-span-2"
            onClick={ctx.exportData}
          >
            Экспорт данных {ctx.exportMsg && `· ${ctx.exportMsg}`}
          </Button>
        )}
      </div>
    </>
  );
}
