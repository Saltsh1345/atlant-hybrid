"use client";

import ProgressRing from "@/components/ui/ProgressRing";

interface MuscleGroup {
  name: string;
  percent: number;
}

interface ReadinessRingProps {
  overall: number;
  label: string;
  groups?: MuscleGroup[];
  emptyText?: string;
  className?: string;
}

export default function ReadinessRing({
  overall,
  label,
  groups = [],
  emptyText = "Нет данных",
  className = "",
}: ReadinessRingProps) {
  if (overall === 0) {
    return (
      <div className={`atlant-metric-card p-4 md:p-5 ${className}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
          Готовность
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`atlant-metric-card p-4 md:p-5 ${className}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--readiness)]">
            Готовность
          </p>
          <p className="text-3xl font-bold tabular-nums text-[var(--readiness)]">
            {overall}%
          </p>
          <p className="text-xs text-[var(--muted)]">{label}</p>
        </div>
        <ProgressRing value={overall} label="Load" />
      </div>
      {groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className="text-[var(--foreground-secondary)]">{g.name}</span>
                <span className="font-mono font-medium text-[var(--primary)]">
                  {g.percent}%
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="atlant-bar-fill h-full rounded-full"
                  style={{ width: `${g.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
