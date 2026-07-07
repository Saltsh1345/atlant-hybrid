"use client";

import type { ReactNode } from "react";

interface MetricTileProps {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: "primary" | "readiness" | "success" | "warning";
  className?: string;
  children?: ReactNode;
}

const accentClass: Record<NonNullable<MetricTileProps["accent"]>, string> = {
  primary: "text-[var(--primary)]",
  readiness: "text-[var(--readiness)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
};

export default function MetricTile({
  label,
  value,
  sub,
  accent = "primary",
  className = "",
  children,
}: MetricTileProps) {
  return (
    <div className={`atlant-metric-card p-4 md:p-5 ${className}`}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${accentClass[accent]}`}
      >
        {label}
      </p>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${accentClass[accent]}`}>
        {value}
      </div>
      {sub ? <p className="mt-0.5 text-xs text-[var(--muted)]">{sub}</p> : null}
      {children}
    </div>
  );
}
