"use client";

import { useMemo } from "react";
import AtlasViewer from "@/components/atlas/AtlasViewer";
import { buildWorkoutAtlasZones } from "@/lib/workout/buildWorkoutAtlasZones";

export default function WorkoutAtlasPanel({
  targetMeshes,
  fatiguePercent,
  failed,
}: {
  targetMeshes: string[];
  fatiguePercent: number;
  failed: boolean;
}) {
  const input = useMemo(
    () => ({
      mode: "live" as const,
      zones: buildWorkoutAtlasZones(targetMeshes, fatiguePercent, failed),
    }),
    [failed, fatiguePercent, targetMeshes],
  );

  return (
    <div className="absolute bottom-4 right-4 z-20 w-32">
      <AtlasViewer input={input} variant="mini" interactive={false} className="h-44" />
      <p className="mt-1 rounded bg-black/65 px-2 py-1 text-center text-[0.55rem] text-cyan-200">
        {failed ? "ОТКАЗ" : fatiguePercent > 0 ? "УТОМЛЕНИЕ" : "ЦЕЛЕВАЯ НАГРУЗКА"}
      </p>
    </div>
  );
}
