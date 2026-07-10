export interface DrillFixation {
  commandId: string;
  commandText: string;
  type: string;
  speedMs: number;
  accuracy: number;
  elbowAngle: number;
  fixed: boolean;
  eliteOverall?: number;
  eliteTechnique?: number;
  eliteActionMatch?: number;
  eliteDeviations?: string[];
}

const fixations: DrillFixation[] = [];

export function resetDrillFixations(): void {
  fixations.length = 0;
}

export function addDrillFixation(entry: DrillFixation): void {
  fixations.push(entry);
}

export function getDrillFixations(): DrillFixation[] {
  return [...fixations];
}

export function drillSummary(): {
  total: number;
  fixed: number;
  avgSpeed: number;
  avgAccuracy: number;
  avgEliteOverall: number;
} {
  const fixed = fixations.filter((f) => f.fixed);
  const speeds = fixed.map((f) => f.speedMs);
  const accs = fixed.map((f) => f.accuracy);
  const elites = fixations
    .map((f) => f.eliteOverall)
    .filter((v): v is number => v != null && v > 0);
  return {
    total: fixations.length,
    fixed: fixed.length,
    avgSpeed:
      speeds.length > 0
        ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 100) /
          100
        : 0,
    avgAccuracy:
      accs.length > 0
        ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length)
        : 0,
    avgEliteOverall:
      elites.length > 0
        ? Math.round(elites.reduce((a, b) => a + b, 0) / elites.length)
        : 0,
  };
}
