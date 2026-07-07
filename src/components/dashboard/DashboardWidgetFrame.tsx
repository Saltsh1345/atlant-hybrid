"use client";

import type { ReactNode } from "react";
import type { DashboardWidgetId } from "@/lib/dashboard/widgets";
import { PINNED_WIDGETS, WIDGET_META } from "@/lib/dashboard/widgets";

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
  const pinned = PINNED_WIDGETS.includes(id);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]/90 shadow-sm backdrop-blur-sm ${
        editMode
          ? "ring-2 ring-[var(--primary)]/40 ring-offset-1 ring-offset-[var(--background)]"
          : ""
      }`}
    >
      {editMode && (
        <div className="dashboard-drag-handle flex shrink-0 cursor-grab items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--primary-muted)] px-3 py-1.5 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[var(--muted)]" aria-hidden>
              ⠿
            </span>
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
              {meta.icon} {meta.title}
            </span>
          </div>
          {!pinned && (
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-[var(--muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              title="Убрать виджет"
            >
              ✕
            </button>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-1 [&_button]:pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
