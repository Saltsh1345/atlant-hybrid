import type { LiveKinematics, Sport, StrengthExercise } from "@/types";

const samples: number[] = [];

export function resetFormScore(): void {
  samples.length = 0;
}

export function pushFormSample(score: number): void {
  samples.push(score);
  if (samples.length > 300) samples.shift();
}

export function getAvgFormScore(): number {
  if (samples.length === 0) return 0;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return Math.round(avg);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeFormScore(
  sport: Sport,
  exercise: StrengthExercise | null,
  k: LiveKinematics
): number {
  switch (sport) {
    case "strength": {
      if (exercise === "bench") {
        const depth = k.elbowAngle < 100 ? 100 : k.elbowAngle < 130 ? 70 : 40;
        const back = k.backAngle > 155 ? 100 : k.backAngle > 140 ? 75 : 45;
        return clamp(Math.round(depth * 0.55 + back * 0.45), 0, 100);
      }
      if (exercise === "lunge") {
        const depth = k.kneeAngle < 110 ? 100 : k.kneeAngle < 130 ? 75 : 45;
        const posture = k.backAngle > 150 ? 100 : k.backAngle > 135 ? 70 : 40;
        return clamp(Math.round(depth * 0.6 + posture * 0.4), 0, 100);
      }
      // squat default
      const depth = k.kneeAngle < 105 ? 100 : k.kneeAngle < 125 ? 75 : 45;
      const back = k.backAngle > 145 ? 100 : k.backAngle > 130 ? 70 : 40;
      return clamp(Math.round(depth * 0.55 + back * 0.45), 0, 100);
    }
    case "boxing": {
      const speed = k.wristVelocityMs > 3 ? 100 : k.wristVelocityMs > 2 ? 80 : 55;
      const posture = k.spineFlexion < 20 ? 100 : k.spineFlexion < 30 ? 70 : 45;
      return clamp(Math.round(speed * 0.5 + posture * 0.5), 0, 100);
    }
    case "tennis": {
      const swing = k.wristVelocityMs > 2.5 ? 95 : k.wristVelocityMs > 1.5 ? 75 : 50;
      const spine = k.spineFlexion < 22 ? 100 : k.spineFlexion < 32 ? 65 : 40;
      return clamp(Math.round(swing * 0.45 + spine * 0.55), 0, 100);
    }
  }
}

export function formScoreLabel(score: number): string {
  if (score >= 85) return "Отлично";
  if (score >= 70) return "Хорошо";
  if (score >= 55) return "Средне";
  return "Нужна работа";
}
