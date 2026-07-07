import type { HealthMetricsSnapshot, HealthReadiness } from "@/types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeHealthReadiness(
  metrics: HealthMetricsSnapshot
): HealthReadiness {
  const sleepMin = metrics.sleep?.lastNight?.durationMin ?? 0;
  const restingBpm = metrics.heartRate?.restingBpm ?? 72;
  const spo2 = metrics.spo2?.latest ?? 97;
  const stress = metrics.stress?.latest ?? 45;

  const sleepScore = clamp(Math.round((sleepMin / 480) * 100), 0, 100);
  const hrScore = clamp(Math.round(100 - Math.max(0, restingBpm - 52) * 2), 0, 100);
  const spo2Score = clamp(Math.round((spo2 / 100) * 100), 0, 100);
  const stressScore = clamp(Math.round(100 - stress), 0, 100);

  const score = Math.round(
    sleepScore * 0.4 + hrScore * 0.25 + spo2Score * 0.15 + stressScore * 0.2
  );

  return {
    score,
    breakdown: { sleepScore, hrScore, spo2Score, stressScore },
    metrics,
  };
}
