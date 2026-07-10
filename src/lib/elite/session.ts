import type { EliteScoreResult } from "@/lib/elite/types";

const samples: EliteScoreResult[] = [];

export function resetEliteSession(): void {
  samples.length = 0;
}

export function pushEliteSample(result: EliteScoreResult): void {
  samples.push(result);
  if (samples.length > 120) samples.shift();
}

export function getEliteSamples(): EliteScoreResult[] {
  return [...samples];
}

export function getAvgEliteScore(): number {
  if (samples.length === 0) return 0;
  const avg =
    samples.reduce((a, s) => a + s.overall, 0) / samples.length;
  return Math.round(avg);
}

export function getAvgEliteTechnique(): number {
  if (samples.length === 0) return 0;
  const avg =
    samples.reduce((a, s) => a + s.techniqueVsElite, 0) / samples.length;
  return Math.round(avg);
}

export function eliteSessionSummary(): {
  count: number;
  avgOverall: number;
  avgTechnique: number;
  avgActionMatch: number;
  topDeviations: string[];
} {
  if (samples.length === 0) {
    return {
      count: 0,
      avgOverall: 0,
      avgTechnique: 0,
      avgActionMatch: 0,
      topDeviations: [],
    };
  }
  const devMap = new Map<string, number>();
  for (const s of samples) {
    for (const d of s.deviations) {
      devMap.set(d, (devMap.get(d) ?? 0) + 1);
    }
  }
  const topDeviations = [...devMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([d]) => d);

  return {
    count: samples.length,
    avgOverall: getAvgEliteScore(),
    avgTechnique: getAvgEliteTechnique(),
    avgActionMatch: Math.round(
      samples.reduce((a, s) => a + s.actionMatch, 0) / samples.length
    ),
    topDeviations,
  };
}
