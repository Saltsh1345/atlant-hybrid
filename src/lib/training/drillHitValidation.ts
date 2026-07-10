import type { LiveKinematics } from "@/types";
import type { EliteFeatureSample, EliteScoreResult } from "@/lib/elite/types";

export interface DrillHitValidation {
  valid: boolean;
  reason: string;
  accuracy: number;
}

const ACTION_LABELS: Record<string, string> = {
  jab: "джеб",
  cross: "кросс",
  hook: "хук",
  combo: "джеб + кросс",
  forehand: "форхенд",
  backhand: "бэкхенд",
  serve: "подача",
};

function label(type: string): string {
  return ACTION_LABELS[type] ?? type;
}

function boxingValidation(
  commandType: string,
  k: LiveKinematics,
  features: EliteFeatureSample,
  elite: EliteScoreResult,
  speedMs: number
): DrillHitValidation {
  const type = commandType.toLowerCase();
  const baseAccuracy = Math.round(
    elite.techniqueVsElite * 0.35 +
      elite.actionMatch * 0.35 +
      Math.min(100, speedMs * 20) * 0.3
  );

  if (speedMs < 2.2) {
    return {
      valid: false,
      reason: "Размах рукой — ударьте резко вперёд (нужно ≥2.2 м/с)",
      accuracy: Math.min(35, baseAccuracy),
    };
  }

  if (type === "jab") {
    if (k.elbowAngle < 148) {
      return {
        valid: false,
        reason: "Джеб: выпрямите руку до конца вперёд",
        accuracy: Math.min(40, baseAccuracy),
      };
    }
    if (features.torsoRotation > 38) {
      return {
        valid: false,
        reason: "Слишком много корпуса — для джеба работает рука",
        accuracy: Math.min(45, baseAccuracy),
      };
    }
    if (elite.matchedAction !== "jab" && elite.actionMatch < 58) {
      return {
        valid: false,
        reason: `Не джеб — движение похоже на «${label(elite.matchedAction)}»`,
        accuracy: baseAccuracy,
      };
    }
  }

  if (type === "cross") {
    if (k.elbowAngle < 150) {
      return {
        valid: false,
        reason: "Кросс: выпрямите заднюю руку через корпус",
        accuracy: Math.min(40, baseAccuracy),
      };
    }
    if (features.torsoRotation < 18) {
      return {
        valid: false,
        reason: "Кросс: разверните плечи и таз",
        accuracy: Math.min(42, baseAccuracy),
      };
    }
    if (
      elite.matchedAction !== "cross" &&
      elite.matchedAction !== "jab" &&
      elite.actionMatch < 55
    ) {
      return {
        valid: false,
        reason: `Не кросс — похоже на «${label(elite.matchedAction)}»`,
        accuracy: baseAccuracy,
      };
    }
  }

  if (type === "hook") {
    if (k.elbowAngle < 75 || k.elbowAngle > 125) {
      return {
        valid: false,
        reason: "Хук: локоть согнут ~90°, удар по дуге",
        accuracy: Math.min(40, baseAccuracy),
      };
    }
    if (features.torsoRotation < 22) {
      return {
        valid: false,
        reason: "Хук: ведите корпусом, не только рукой",
        accuracy: Math.min(42, baseAccuracy),
      };
    }
    if (elite.matchedAction !== "hook" && elite.actionMatch < 55) {
      return {
        valid: false,
        reason: `Не хук — похоже на «${label(elite.matchedAction)}»`,
        accuracy: baseAccuracy,
      };
    }
  }

  if (type === "combo") {
    if (speedMs < 2.4) {
      return {
        valid: false,
        reason: "Комбо: два чётких удара подряд, не махать",
        accuracy: Math.min(38, baseAccuracy),
      };
    }
    if (elite.actionMatch < 50 && elite.techniqueVsElite < 50) {
      return {
        valid: false,
        reason: "Комбо не распознано — сначала джеб, потом кросс",
        accuracy: baseAccuracy,
      };
    }
  }

  if (elite.actionMatch < 52 && type !== "combo") {
    return {
      valid: false,
      reason: `Не «${label(type)}» — камера видит «${label(elite.matchedAction)}»`,
      accuracy: baseAccuracy,
    };
  }

  if (baseAccuracy < 52) {
    return {
      valid: false,
      reason: "Техника слабая — удар не засчитан",
      accuracy: baseAccuracy,
    };
  }

  return { valid: true, reason: "", accuracy: baseAccuracy };
}

function tennisValidation(
  commandType: string,
  k: LiveKinematics,
  features: EliteFeatureSample,
  elite: EliteScoreResult,
  speedMs: number
): DrillHitValidation {
  const type = commandType.toLowerCase();
  const baseAccuracy = Math.round(
    elite.techniqueVsElite * 0.4 +
      elite.actionMatch * 0.35 +
      Math.min(100, speedMs * 18) * 0.25
  );

  if (speedMs < 2.0) {
    return {
      valid: false,
      reason: "Слишком медленно — нужен полный замах",
      accuracy: Math.min(35, baseAccuracy),
    };
  }

  if (features.torsoRotation < 15) {
    return {
      valid: false,
      reason: "Поверните корпус — не только рука",
      accuracy: Math.min(40, baseAccuracy),
    };
  }

  if (k.spineFlexion < 6) {
    return {
      valid: false,
      reason: "Нет замаха — разверните плечи",
      accuracy: Math.min(38, baseAccuracy),
    };
  }

  if (elite.matchedAction !== type && elite.actionMatch < 55) {
    return {
      valid: false,
      reason: `Не «${label(type)}» — похоже на «${label(elite.matchedAction)}»`,
      accuracy: baseAccuracy,
    };
  }

  if (baseAccuracy < 50) {
    return {
      valid: false,
      reason: "Замах не засчитан — доведите дугу до конца",
      accuracy: baseAccuracy,
    };
  }

  return { valid: true, reason: "", accuracy: baseAccuracy };
}

export function validateDrillHit(
  commandType: string,
  sport: "boxing" | "tennis",
  k: LiveKinematics,
  features: EliteFeatureSample,
  elite: EliteScoreResult,
  speedMs: number
): DrillHitValidation {
  if (sport === "boxing") {
    return boxingValidation(commandType, k, features, elite, speedMs);
  }
  return tennisValidation(commandType, k, features, elite, speedMs);
}
