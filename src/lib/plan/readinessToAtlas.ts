import type { AtlasMuscleGroup, AtlasZoneVisual } from "@/types/atlas";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";
import { atlasGroupMeshes, atlasMuscleName } from "@/lib/three/atlasMuscleMap";
import type { PlanSessionRow } from "@/lib/plan/types";

/** Порог, ниже которого группа считается невосстановленной. */
export const NOT_RECOVERED_THRESHOLD = 55;

/** Русские группы readiness → группы атласа. */
const READINESS_TO_ATLAS: Record<string, AtlasMuscleGroup[]> = {
  Ноги: ["quads", "hamstrings", "glutes", "calves"],
  Спина: ["back"],
  Грудь: ["chest"],
  Плечи: ["shoulders"],
  Кор: ["core"],
};

const GROUP_NAMES = Object.keys(READINESS_TO_ATLAS);

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

/**
 * Восстановление групп по истории Supabase `workout_sessions`.
 * В отличие от `computeMuscleReadiness`, не требует latchedBody:
 * на `/plan` источник данных — сохранённые тренировки, а не калибровка камеры.
 */
export function computePlanRecovery(
  sessions: PlanSessionRow[],
): { name: string; percent: number }[] {
  const penalty: Record<string, number> = {};

  for (const s of sessions) {
    const hours = hoursSince(s.completedAt);
    if (hours > 72) continue;
    // Свежая нагрузка бьёт сильнее: 0 ч → 1.0, 72 ч → 0.
    const freshness = Math.max(0, 1 - hours / 72);
    const load = Math.min(30, 12 + s.durationSec / 120) * freshness;

    const hit = (name: string, factor: number) => {
      penalty[name] = (penalty[name] ?? 0) + load * factor;
    };

    if (s.sport === "strength") {
      if (s.exercise === "bench") {
        hit("Грудь", 1);
        hit("Плечи", 0.6);
      } else if (s.exercise === "lunge") {
        hit("Ноги", 1);
        hit("Кор", 0.4);
      } else {
        hit("Ноги", 1);
        hit("Спина", 0.6);
        hit("Кор", 0.4);
      }
    } else if (s.sport === "boxing") {
      hit("Плечи", 1);
      hit("Кор", 0.7);
    } else if (s.sport === "tennis") {
      hit("Плечи", 1);
      hit("Спина", 0.7);
      hit("Ноги", 0.4);
    }
  }

  return GROUP_NAMES.map((name) => ({
    name,
    percent: Math.round(Math.max(20, Math.min(100, 100 - (penalty[name] ?? 0)))),
  }));
}

export function overallRecovery(
  groups: { name: string; percent: number }[],
): number {
  if (groups.length === 0) return 100;
  return Math.round(
    groups.reduce((acc, g) => acc + g.percent, 0) / groups.length,
  );
}

export function notRecoveredGroupNames(
  groups: { name: string; percent: number }[],
): string[] {
  return groups
    .filter((g) => g.percent < NOT_RECOVERED_THRESHOLD)
    .map((g) => g.name);
}

/**
 * Зоны для замороженного AtlasViewer в режиме `plan`:
 * невосстановленные группы — `not_recovered`, целевые мыщцы дня — `target`.
 * Целевая подсветка имеет приоритет над невосстановленной.
 */
export function buildPlanAtlasZones(
  groups: { name: string; percent: number }[],
  targetMeshes: string[],
): AtlasZoneVisual[] {
  const zones = new Map<MuscleMeshName, AtlasZoneVisual>();

  for (const group of groups) {
    if (group.percent >= NOT_RECOVERED_THRESHOLD) continue;
    for (const atlasGroup of READINESS_TO_ATLAS[group.name] ?? []) {
      for (const mesh of atlasGroupMeshes(atlasGroup)) {
        zones.set(mesh, { zone: mesh, status: "not_recovered" });
      }
    }
  }

  for (const raw of targetMeshes) {
    const mesh = atlasMuscleName(raw);
    if (!mesh) continue;
    zones.set(mesh, { zone: mesh, status: "target" });
  }

  return Array.from(zones.values());
}
