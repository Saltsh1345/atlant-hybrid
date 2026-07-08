"use client";

import { useMemo, type ReactNode } from "react";
import { renderDashboardWidget } from "@/components/dashboard/DashboardWidgetViews";
import DashboardWidgetFrame from "@/components/dashboard/DashboardWidgetFrame";
import {
  allWidgetIds,
  dashboardSections,
  type DashboardWidgetId,
} from "@/lib/dashboard/widgets";
import type { ReadinessReport } from "@/lib/readiness";
import type { WorkoutPlan } from "@/lib/ai/workoutPlan";
import type {
  LatchedBodyData,
  SessionSummary,
  Sport,
  StrengthExercise,
  UserProfile,
} from "@/types";

export interface DashboardWidgetContext {
  profile: UserProfile | null;
  bodyDataLocked: boolean;
  latchedBody: LatchedBodyData | null;
  readiness: ReadinessReport;
  plan: WorkoutPlan | null;
  geminiOk: boolean | null;
  lastSession: SessionSummary | null;
  sessionHistory: SessionSummary[];
  showBodyTiles: boolean;
  onScan: () => void;
  onSelectSport: (sport: Sport, exercise?: StrengthExercise) => void;
  onTwinLive?: () => void;
  exportData: () => void;
  exportMsg: string;
}

export function buildDashboardWidgets(
  ctx: DashboardWidgetContext,
  opts?: { highlightSport?: boolean }
): Partial<Record<DashboardWidgetId, ReactNode>> {
  const ids = allWidgetIds().filter(
    (id) => id !== "body-metrics" || ctx.showBodyTiles
  );
  const widgets: Partial<Record<DashboardWidgetId, ReactNode>> = {};
  for (const id of ids) {
    widgets[id] = renderDashboardWidget(id, ctx, {
      onSelectSport: ctx.onSelectSport,
      highlightSport: opts?.highlightSport,
    });
  }
  return widgets;
}

function MobileWidget({
  id,
  children,
  minH,
}: {
  id: DashboardWidgetId;
  children: ReactNode;
  minH?: string;
}) {
  return (
    <DashboardWidgetFrame id={id}>
      <div className={minH ?? "min-h-[120px]"}>{children}</div>
    </DashboardWidgetFrame>
  );
}

export function DashboardMobileModular({
  ctx,
  highlightSport,
}: {
  ctx: DashboardWidgetContext;
  highlightSport?: boolean;
}) {
  const widgets = useMemo(
    () => buildDashboardWidgets(ctx, { highlightSport }),
    [ctx, highlightSport]
  );

  const sections = dashboardSections(ctx.showBodyTiles);

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <section key={section.id}>
          <header className="mb-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="mt-0.5 text-xs text-muted">{section.subtitle}</p>
            )}
          </header>
          <div className="flex flex-col gap-3">
            {section.widgets.map((id) => (
              <MobileWidget
                key={id}
                id={id}
                minH={id === "sport-picker" ? "min-h-[200px]" : undefined}
              >
                {widgets[id]}
              </MobileWidget>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
