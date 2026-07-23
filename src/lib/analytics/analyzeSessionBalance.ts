import { atlasMuscleName } from "@/lib/three/atlasMuscleMap";
import type { AtlasLoadStatus } from "@/types/atlas";
import type {
  AnalyticsSessionRow,
  ZoneInsight,
} from "@/lib/analytics/types";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";

function uniqueMeshes(meshes: string[]): MuscleMeshName[] {
  return Array.from(
    new Set(
      meshes
        .map((mesh) => atlasMuscleName(mesh))
        .filter((mesh): mesh is MuscleMeshName => mesh !== null),
    ),
  );
}

function statusForTarget(
  fatiguePercent: number,
  failed: boolean,
): AtlasLoadStatus {
  if (failed || fatiguePercent >= 20) return "overloaded";
  if (fatiguePercent > 0) return "worked_well";
  return "worked";
}

function loadLabel(status: AtlasLoadStatus): string {
  switch (status) {
    case "worked":
      return "Штатная нагрузка";
    case "worked_well":
      return "Хорошая целевая нагрузка";
    case "overloaded":
      return "Перегрузка / отказ";
    case "underworked":
      return "Недоработано";
    default:
      return "Нейтрально";
  }
}

function recommendation(status: AtlasLoadStatus, zone: MuscleMeshName): string {
  const side = zone.endsWith("_l")
    ? "слева"
    : zone.endsWith("_r")
      ? "справа"
      : "";
  switch (status) {
    case "worked":
      return `Зона ${zone}${side ? ` (${side})` : ""} отработала в штатном режиме. Сохраняйте текущий объём.`;
    case "worked_well":
      return `Целевая зона ${zone} получила хорошую нагрузку. Можно чуть повысить скорость/объём на следующей сессии при стабильной технике.`;
    case "overloaded":
      return `Зона ${zone} перегружена по VBT/усталости. Снизьте объём или скорость на 10–20% и проверьте симметрию.`;
    case "underworked":
      return `Зона ${zone} почти не участвовала. Добавьте акцент на неё в следующем плане или усильте активацию.`;
    default:
      return `Нет достаточных данных по зоне ${zone}.`;
  }
}

/**
 * Post-workout раскраска атласа по данным сессии и целевым mesh плана.
 * Истинная асимметрия (вальгус → VMO) без пиковых углов недоступна —
 * симметрия оценивается эвристически по наличию парных target-mesh.
 */
export function analyzeSessionZones(
  session: AnalyticsSessionRow | null,
  targetMeshes: string[],
): ZoneInsight[] {
  const fatigue = session?.summary?.fatiguePercent ?? 0;
  const failed = session?.summary?.failed === true;
  const targets = uniqueMeshes(
    targetMeshes.length > 0
      ? targetMeshes
      : session?.exercise === "bench"
        ? ["chest_l", "chest_r", "triceps_l", "triceps_r"]
        : ["quadriceps_l", "quadriceps_r", "glutes_l", "glutes_r"],
  );

  const targetStatus = statusForTarget(fatigue, failed);
  const targetSet = new Set(targets);

  // Смежные «поддерживающие» группы помечаем как штатно отработавшие,
  // остальные рабочие мышцы нижней/верхней цепи — как недоработавшие.
  const supportCandidates: MuscleMeshName[] =
    session?.exercise === "bench"
      ? (["shoulders_l", "shoulders_r", "abs_c"] as MuscleMeshName[])
      : (["hamstrings_l", "hamstrings_r", "calves_l", "calves_r", "abs_c"] as MuscleMeshName[]);

  const zones: ZoneInsight[] = [];

  for (const zone of targets) {
    zones.push({
      zone,
      status: targetStatus,
      loadLabel: loadLabel(targetStatus),
      recommendation: recommendation(targetStatus, zone),
    });
  }

  for (const zone of supportCandidates) {
    if (targetSet.has(zone)) continue;
    zones.push({
      zone,
      status: "worked",
      loadLabel: loadLabel("worked"),
      recommendation: recommendation("worked", zone),
    });
  }

  // Явно пометим ключевые недоработавшие мышцы противоположной цепи.
  const underworkedPool: MuscleMeshName[] =
    session?.exercise === "bench"
      ? (["back_l", "back_r", "quadriceps_l", "quadriceps_r"] as MuscleMeshName[])
      : (["chest_l", "chest_r", "biceps_l", "biceps_r"] as MuscleMeshName[]);

  for (const zone of underworkedPool) {
    if (targetSet.has(zone)) continue;
    if (zones.some((z) => z.zone === zone)) continue;
    zones.push({
      zone,
      status: "underworked",
      loadLabel: loadLabel("underworked"),
      recommendation: recommendation("underworked", zone),
    });
  }

  return zones;
}

export function buildAnalyticsAtlasZones(zones: ZoneInsight[]) {
  return zones.map(({ zone, status }) => ({ zone, status }));
}
