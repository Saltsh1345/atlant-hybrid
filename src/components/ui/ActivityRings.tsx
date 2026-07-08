"use client";

import type { ActivityRing } from "@/lib/activity/rings";

function Ring({
  ring,
  radius,
  stroke,
}: {
  ring: ActivityRing;
  radius: number;
  stroke: number;
}) {
  const pct = Math.min(1, ring.goal > 0 ? ring.value / ring.goal : 0);
  const c = 2 * Math.PI * radius;
  const dash = pct * c;
  const size = (radius + stroke) * 2 + 4;
  const cx = size / 2;

  return (
    <circle
      cx={cx}
      cy={cx}
      r={radius}
      fill="none"
      stroke={ring.color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeDasharray={`${dash} ${c}`}
      transform={`rotate(-90 ${cx} ${cx})`}
      className="atlant-ring-progress"
      style={{
        filter: `drop-shadow(0 0 6px ${ring.color})`,
      }}
    />
  );
}

export default function ActivityRings({
  rings,
  periodLabel = "За неделю",
  className = "",
}: {
  rings: ActivityRing[];
  periodLabel?: string;
  className?: string;
}) {
  const outer = rings[0];
  const middle = rings[1];
  const inner = rings[2];
  const size = 200;
  const cx = size / 2;

  return (
    <div className={`atlant-metric-card p-4 md:p-5 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Кольца активности
      </p>
      <p className="text-xs text-foreground-secondary">{periodLabel}</p>

      <div className="relative mx-auto my-4 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track rings */}
          {[72, 56, 40].map((r) => (
            <circle
              key={`track-${r}`}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth={10}
            />
          ))}
          {outer && (
            <Ring ring={outer} radius={72} stroke={10} />
          )}
          {middle && (
            <Ring ring={middle} radius={56} stroke={10} />
          )}
          {inner && (
            <Ring ring={inner} radius={40} stroke={10} />
          )}
        </svg>
      </div>

      <div className="space-y-2">
        {rings.map((ring) => {
          const pct = Math.min(
            100,
            Math.round((ring.value / ring.goal) * 100)
          );
          return (
            <div key={ring.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: ring.color, boxShadow: `0 0 8px ${ring.color}` }}
                />
                <span className="text-foreground-secondary">{ring.label}</span>
              </div>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {ring.value}
                <span className="text-muted"> / {ring.goal} {ring.unit}</span>
                <span className="ml-1 text-muted">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
