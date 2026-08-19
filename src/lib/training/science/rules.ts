import type { TrainingPrimaryGoal, TrainingLocation } from "@/lib/training/intake/types";
import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";

/** Упрощённые ориентиры объёма (hard sets / muscle / week). */
export const WEEKLY_SETS_BY_GOAL: Record<
  TrainingPrimaryGoal,
  { min: number; max: number }
> = {
  lose_weight: { min: 8, max: 14 },
  gain_muscle: { min: 12, max: 20 },
  strength: { min: 10, max: 16 },
  health: { min: 6, max: 12 },
  performance: { min: 10, max: 18 },
  recomposition: { min: 10, max: 16 },
};

/** Минимальный отдых между тренировками одной группы (часы). */
export const MIN_HOURS_BETWEEN_SAME_GROUP = 48;

/** Deload каждые N недель для новичков/средних. */
export const DELOAD_EVERY_WEEKS = 4;

/** Оборудование, доступное дома vs зал — фильтр каталога. */
export function equipmentAllowedAtLocation(
  location: TrainingLocation,
  equipment?: string,
): boolean {
  if (!equipment) return true;
  const e = equipment.toLowerCase();
  const gymOnly =
    e.includes("штанга") ||
    e.includes("barbell") ||
    e.includes("тренаж") ||
    e.includes("machine") ||
    e.includes("smith");

  if (location === "gym") return true;
  if (location === "home") {
    return (
      e.includes("гантел") ||
      e.includes("dumbbell") ||
      e.includes("коврик") ||
      e.includes("bodyweight") ||
      e.includes("собственн") ||
      e.includes("резин") ||
      e.includes("kettlebell") ||
      !gymOnly
    );
  }
  return true;
}

export function scienceContextForPrompt(opts: {
  goal: TrainingPrimaryGoal;
  location: TrainingLocation;
  daysPerWeek: number;
  weeks: number;
  bioScan?: BioScanProfile | null;
}): string {
  const vol = WEEKLY_SETS_BY_GOAL[opts.goal];
  const lines = [
    `Целевой объём: ${vol.min}–${vol.max} тяжёлых подходов на группу мышц в неделю.`,
    `Частота: ${opts.daysPerWeek} тренировок/нед., мезоцикл ${opts.weeks} нед.`,
    `Минимум ${MIN_HOURS_BETWEEN_SAME_GROUP} ч между повторной нагрузкой одной группы.`,
    `Deload или разгрузочная неделя каждые ${DELOAD_EVERY_WEEKS} нед. при накоплении fatigue.`,
    opts.location === "home"
      ? "Локация: дом — без штанги и тяжёлых тренажёров, приоритет гантели/собственный вес."
      : opts.location === "gym"
        ? "Локация: зал — полный доступ к штанге и тренажёрам."
        : "Локация: гибрид — база в зале, домашние дни легче.",
  ];

  const bio = opts.bioScan;
  if (bio?.findings.length) {
    const focus = [
      ...new Set(
        bio.findings.flatMap((f) => f.trainingFocus ?? []),
      ),
    ];
    if (focus.length) {
      lines.push(`Акценты по биоскану: ${focus.join(", ")}.`);
    }
    const priority = bio.findings.filter((f) => f.severity === "priority");
    if (priority.length) {
      lines.push(
        `Приоритет биоскана: ${priority.map((p) => p.title).join("; ")}.`,
      );
    }
  }

  return lines.join("\n");
}
