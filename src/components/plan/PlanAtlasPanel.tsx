"use client";

import { useMemo } from "react";
import AtlasViewer from "@/components/atlas/AtlasViewer";
import { buildPlanAtlasZones } from "@/lib/plan/readinessToAtlas";
import type { DailyPlan } from "@/lib/plan/types";

export interface PlanAtlasPanelProps {
  readinessGroups: { name: string; percent: number }[];
  plan: DailyPlan | null;
}

export default function PlanAtlasPanel({
  readinessGroups,
  plan,
}: PlanAtlasPanelProps) {
  const zones = useMemo(
    () => buildPlanAtlasZones(readinessGroups, plan?.targetMeshes ?? []),
    [readinessGroups, plan],
  );

  const input = useMemo(
    () => ({ mode: "plan" as const, zones }),
    [zones],
  );

  return (
    <div className="flex flex-col gap-3">
      <AtlasViewer
        input={input}
        variant="full"
        interactive
        className="h-[24rem]"
      />
      <div className="flex flex-wrap gap-4 text-[0.65rem] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#4a9dff]" />
          цель на сегодня
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#9f3d4d]" />
          не восстановлено
        </span>
      </div>
      {readinessGroups.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {readinessGroups.map((group) => (
            <div
              key={group.name}
              className="rounded-lg border border-white/8 bg-black/30 px-2 py-1.5 text-center"
            >
              <div className="text-[0.6rem] text-zinc-500">{group.name}</div>
              <div
                className={`text-xs font-bold ${
                  group.percent < 55 ? "text-rose-300" : "text-cyan-200"
                }`}
              >
                {group.percent}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
