"use client";

import type { ReactNode } from "react";
import type { DashboardWidgetId } from "@/lib/dashboard/widgets";
import { WIDGET_META, WIDGETS_WITHOUT_HEADER } from "@/lib/dashboard/widgets";
import AppIcon from "@/components/ui/AppIcon";

export default function DashboardWidgetFrame({
  id,
  children,
  className = "",
}: {
  id: DashboardWidgetId;
  children: ReactNode;
  className?: string;
}) {
  const meta = WIDGET_META[id];
  const hideHeader = WIDGETS_WITHOUT_HEADER.includes(id);

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]/90 shadow-sm backdrop-blur-sm ${className}`}
    >
      {!hideHeader && (
        <div className="shrink-0 border-b border-[var(--border)]/60 px-4 py-2.5">
          <h3 className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            <span className="mr-1.5 inline-flex align-middle" aria-hidden>
              <AppIcon name={meta.icon} className="h-3.5 w-3.5" />
            </span>
            {meta.title}
          </h3>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}
