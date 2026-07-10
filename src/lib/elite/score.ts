import type { EliteFeatureRange, EliteFeatureSample, EliteScoreResult } from "@/lib/elite/types";
import type { EliteReference } from "@/lib/elite/types";
import { ELITE_REFERENCES, getEliteReference } from "@/lib/elite/references";
import type { EliteActionId } from "@/lib/elite/types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function scoreFeature(value: number, range: EliteFeatureRange): number {
  if (value >= range.min && value <= range.max) {
    const span = Math.max(range.max - range.min, 1);
    const dist = Math.abs(value - range.ideal) / span;
    return clamp(Math.round(100 - dist * 35), 72, 100);
  }
  if (value < range.min) {
    const gap = range.min - value;
    const span = Math.max(range.max - range.min, 1);
    return clamp(Math.round(65 - (gap / span) * 80), 0, 64);
  }
  const gap = value - range.max;
  const span = Math.max(range.max - range.min, 1);
  return clamp(Math.round(65 - (gap / span) * 80), 0, 64);
}

function featureValue(
  sample: EliteFeatureSample,
  key: keyof EliteReference["features"]
): number | null {
  switch (key) {
    case "elbowAngle":
      return sample.elbowAngle;
    case "torsoRotation":
      return sample.torsoRotation;
    case "wristVelocityMs":
      return sample.wristVelocityMs;
    case "spineFlexion":
      return sample.spineFlexion;
    case "kneeAngle":
      return sample.kneeAngle;
    case "backAngle":
      return sample.backAngle;
    default:
      return null;
  }
}

export function scoreAgainstReference(
  sample: EliteFeatureSample,
  ref: EliteReference
): { score: number; deviations: string[] } {
  const deviations: string[] = [];
  let weighted = 0;
  let totalWeight = 0;

  for (const [key, range] of Object.entries(ref.features) as [
    keyof EliteReference["features"],
    EliteFeatureRange,
  ][]) {
    const val = featureValue(sample, key);
    if (val == null || range == null) continue;
    const part = scoreFeature(val, range);
    weighted += part * range.weight;
    totalWeight += range.weight;
    if (part < 60) {
      if (key === "wristVelocityMs") {
        deviations.push(
          val < range.min
            ? "Недостаточная скорость — ускорьте удар"
            : "Слишком резко — контролируйте технику"
        );
      } else if (key === "elbowAngle") {
        deviations.push(
          val < range.min
            ? "Локоть недовыпрямлен"
            : "Локоть переразогнут или удар «ломаный»"
        );
      } else if (key === "torsoRotation") {
        deviations.push(
          val < range.min
            ? "Мало вращения корпуса"
            : "Перекрут корпуса — потеря баланса"
        );
      } else if (key === "kneeAngle") {
        deviations.push(
          val > range.max ? "Недостаточная глубина" : "Слишком глубоко — колени"
        );
      } else if (key === "backAngle") {
        deviations.push(
          val < range.min ? "Округление спины" : "Излишний наклон"
        );
      }
    }
  }

  const score =
    totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  return { score, deviations: [...new Set(deviations)].slice(0, 3) };
}

/** Heuristic: which elite action best matches current kinematics */
export function detectLikelyAction(
  sample: EliteFeatureSample,
  sport: "boxing" | "tennis"
): EliteActionId {
  const refs = ELITE_REFERENCES.filter((r) => r.sport === sport);
  let best: EliteActionId = sport === "boxing" ? "jab" : "forehand";
  let bestScore = -1;
  for (const ref of refs) {
    if (ref.id === "combo") continue;
    const { score } = scoreAgainstReference(sample, ref);
    if (score > bestScore) {
      bestScore = score;
      best = ref.id;
    }
  }
  return best;
}

export function computeEliteScore(
  sample: EliteFeatureSample,
  expectedAction: string,
  sport: "boxing" | "tennis" | "strength"
): EliteScoreResult {
  const expected = expectedAction.toLowerCase() as EliteActionId;
  const ref =
    getEliteReference(expected) ??
    getEliteReference(detectLikelyAction(sample, sport === "strength" ? "boxing" : sport));

  if (!ref) {
    return {
      action: expected,
      actionMatch: 50,
      techniqueVsElite: 50,
      overall: 50,
      matchedAction: expected,
      deviations: [],
      cues: [],
    };
  }

  const matched =
    sport === "strength"
      ? ref.id
      : detectLikelyAction(
          sample,
          sport === "boxing" ? "boxing" : "tennis"
        );

  const expectedRef = ref;
  const { score: techniqueVsElite, deviations } = scoreAgainstReference(
    sample,
    expectedRef
  );

  let actionMatch = 100;
  if (sport !== "strength" && expected !== "combo") {
    if (matched !== expected) {
      const matchedRef = getEliteReference(matched);
      const expectedScore = techniqueVsElite;
      const matchedScore = matchedRef
        ? scoreAgainstReference(sample, matchedRef).score
        : 0;
      actionMatch =
        matched === expected
          ? 100
          : clamp(
              Math.round(45 + (expectedScore - matchedScore) * 0.3),
              15,
              85
            );
      if (matched !== expected && matchedScore > expectedScore + 8) {
        actionMatch = clamp(actionMatch - 25, 10, 70);
      }
    }
  } else if (expected === "combo") {
    actionMatch = techniqueVsElite >= 55 ? 85 : 60;
  }

  const overall = Math.round(techniqueVsElite * 0.65 + actionMatch * 0.35);

  return {
    action: expected,
    actionMatch,
    techniqueVsElite,
    overall,
    matchedAction: matched,
    deviations,
    cues: expectedRef.coachCues.slice(0, 2),
  };
}

export function eliteScoreLabel(score: number): string {
  if (score >= 88) return "Олимпийский уровень";
  if (score >= 75) return "Близко к элите";
  if (score >= 60) return "Хорошая база";
  if (score >= 45) return "Нужна работа";
  return "Далеко от эталона";
}
