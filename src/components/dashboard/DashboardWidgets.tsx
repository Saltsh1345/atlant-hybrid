"use client";

import { useMemo, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { renderDashboardWidget } from "@/components/dashboard/DashboardWidgetViews";
import DashboardWidgetFrame from "@/components/dashboard/DashboardWidgetFrame";
import {
  allWidgetIds,
  WIDGET_META,
  type DashboardWidgetId,
} from "@/lib/dashboard/widgets";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
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

function MobileEditBar() {
  const editMode = useDashboardLayoutStore((s) => s.editMode);
  const setEditMode = useDashboardLayoutStore((s) => s.setEditMode);
  const resetLayout = useDashboardLayoutStore((s) => s.resetLayout);

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Button
        size="md"
        variant={editMode ? "primary" : "secondary"}
        className="!w-auto"
        onClick={() => setEditMode(!editMode)}
      >
        {editMode ? "Готово" : "Настроить виджеты"}
      </Button>
      {editMode && (
        <Button
          size="md"
          variant="ghost"
          className="!w-auto"
          onClick={() => {
            if (window.confirm("Сбросить виджеты по умолчанию?")) resetLayout();
          }}
        >
          Сброс
        </Button>
      )}
    </div>
  );
}

export function DashboardMobileModular({
  ctx,
  highlightSport,
}: {
  ctx: DashboardWidgetContext;
  highlightSport?: boolean;
}) {
  const visibleWidgets = useDashboardLayoutStore((s) => s.visibleWidgets);
  const editMode = useDashboardLayoutStore((s) => s.editMode);
  const removeWidget = useDashboardLayoutStore((s) => s.removeWidget);
  const addWidget = useDashboardLayoutStore((s) => s.addWidget);

  const widgets = useMemo(
    () => buildDashboardWidgets(ctx, { highlightSport }),
    [ctx, highlightSport]
  );

  const hidden = allWidgetIds().filter(
    (id) =>
      !visibleWidgets.includes(id) &&
      (id !== "body-metrics" || ctx.showBodyTiles)
  );

  return (
    <>
      <MobileEditBar />
      {editMode && hidden.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 p-3">
          {hidden.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => addWidget(id)}
              className="rounded-lg border border-cyan-200 bg-white px-2 py-1.5 text-xs text-cyan-800"
            >
              + {WIDGET_META[id].icon} {WIDGET_META[id].title}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {visibleWidgets.map((id) => (
          <DashboardWidgetFrame
            key={id}
            id={id}
            editMode={editMode}
            onRemove={removeWidget}
          >
            <div className={id === "sport-picker" ? "min-h-[200px]" : "min-h-[120px]"}>
              {widgets[id]}
            </div>
          </DashboardWidgetFrame>
        ))}
      </div>
    </>
  );
}
