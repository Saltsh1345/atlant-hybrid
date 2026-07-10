const WINDOW = 20;
const MIN_SAMPLES = 6;

export class DistanceSmoother {
  private buf: number[] = [];

  push(meters: number): void {
    if (!Number.isFinite(meters)) return;
    this.buf.push(meters);
    if (this.buf.length > WINDOW) this.buf.shift();
  }

  median(): number | null {
    if (this.buf.length < MIN_SAMPLES) return null;
    const sorted = [...this.buf].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  reset(): void {
    this.buf = [];
  }
}

let shared: DistanceSmoother | null = null;

export function getDistanceSmoother(): DistanceSmoother {
  if (!shared) shared = new DistanceSmoother();
  return shared;
}

export function resetDistanceSmoother(): void {
  shared?.reset();
}
