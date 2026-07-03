"use client";

import type { ReactNode } from "react";
import type { DashboardWidgetId } from "@/lib/dashboard/widgets";
import { WIDGET_META } from "@/lib/dashboard/widgets";

export default function DashboardWidgetFrame({
  id,
  editMode,
  onRemove,
  children,
}: {
  id: DashboardWidgetId;
  editMode: boolean;
  onRemove: (id: DashboardWidgetId) => void;
  children: ReactNode;
}) {
  const meta = WIDGET_META[id];

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-sm ${
        editMode
          ? "ring-2 ring-cyan-400/40 ring-offset-1 ring-offset-slate-50"
          : ""
      }`}
    >
      {editMode && (
        <div className="dashboard-drag-handle flex shrink-0 cursor-grab items-center justify-between gap-2 border-b border-cyan-100 bg-gradient-to-r from-cyan-50/90 to-white px-3 py-1.5 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-slate-400" aria-hidden>
              ⠿
            </span>
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-cyan-800">
              {meta.icon} {meta.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Убрать виджет"
          >
            ✕
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-1">{children}</div>
    </div>
  );
}
