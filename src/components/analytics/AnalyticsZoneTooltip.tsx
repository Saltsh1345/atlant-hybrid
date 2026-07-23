"use client";

import type { ZoneInsight } from "@/lib/analytics/types";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";

export interface AnalyticsZoneTooltipProps {
  zones: ZoneInsight[];
  selectedZone: MuscleMeshName | null;
}

export default function AnalyticsZoneTooltip({
  zones,
  selectedZone,
}: AnalyticsZoneTooltipProps) {
  if (!selectedZone) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-500">
        Выберите мышцу на атласе, чтобы увидеть нагрузку и рекомендацию.
      </div>
    );
  }

  const insight = zones.find((zone) => zone.zone === selectedZone);
  if (!insight) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-400">
        По зоне <span className="text-cyan-200">{selectedZone}</span> нет данных
        post-workout.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-300/25 bg-black/50 px-4 py-4">
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500">
        Мышца
      </p>
      <p className="mt-1 font-mono text-sm text-cyan-100">{insight.zone}</p>
      <p className="mt-3 text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500">
        Нагрузка
      </p>
      <p className="mt-1 text-sm text-zinc-100">{insight.loadLabel}</p>
      <p className="mt-3 text-[0.65rem] uppercase tracking-[0.14em] text-zinc-500">
        Рекомендация
      </p>
      <p className="mt-1 text-sm leading-6 text-zinc-300">{insight.recommendation}</p>
    </div>
  );
}
