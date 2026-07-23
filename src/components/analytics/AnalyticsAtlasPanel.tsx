"use client";

import { useMemo } from "react";
import AtlasViewer from "@/components/atlas/AtlasViewer";
import { buildAnalyticsAtlasZones } from "@/lib/analytics/analyzeSessionBalance";
import type { ZoneInsight } from "@/lib/analytics/types";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";

export interface AnalyticsAtlasPanelProps {
  zones: ZoneInsight[];
  selectedZone: MuscleMeshName | null;
  onZoneSelect: (zone: MuscleMeshName | null) => void;
}

export default function AnalyticsAtlasPanel({
  zones,
  selectedZone,
  onZoneSelect,
}: AnalyticsAtlasPanelProps) {
  const atlasZones = useMemo(() => buildAnalyticsAtlasZones(zones), [zones]);
  const input = useMemo(
    () => ({
      mode: "post_workout" as const,
      zones: atlasZones,
      selectedZone,
    }),
    [atlasZones, selectedZone],
  );

  return (
    <div className="flex flex-col gap-3">
      <AtlasViewer
        input={input}
        variant="full"
        interactive
        className="h-[min(70vh,36rem)]"
        onZoneSelect={onZoneSelect}
      />
      <div className="flex flex-wrap gap-4 text-[0.65rem] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#72b7ff]" />
          штатная работа
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#a6ff2e]" />
          хорошая целевая нагрузка
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ff3b5c]" />
          перегрузка
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0c1320] ring-1 ring-white/20" />
          недоработано
        </span>
      </div>
      <p className="text-[0.65rem] text-zinc-500">
        Вращайте модель пальцем или мышью. Нажмите на мышцу для подсказки.
      </p>
    </div>
  );
}
