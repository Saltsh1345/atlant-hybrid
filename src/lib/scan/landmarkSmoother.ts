import type { NormalizedLandmark } from "@/types";

/**
 * Экспоненциальное сглаживание landmarks для стабильного захвата на `/scan`.
 * Снижает дрожание MediaPipe между кадрами без лагов UI.
 */
export class LandmarkSmoother {
  private previous: NormalizedLandmark[] | null = null;

  constructor(
    private readonly alpha = 0.35,
    private readonly visibilityFloor = 0.2,
  ) {}

  update(next: NormalizedLandmark[] | null): NormalizedLandmark[] | null {
    if (!next?.length) {
      this.previous = null;
      return null;
    }

    if (!this.previous || this.previous.length !== next.length) {
      this.previous = next.map((landmark) => ({ ...landmark }));
      return this.previous.map((landmark) => ({ ...landmark }));
    }

    const smoothed = next.map((landmark, index) => {
      const prev = this.previous![index];
      const visibility = landmark.visibility ?? 0;
      // Низкая видимость — меньше доверия новому кадру.
      const a =
        visibility < this.visibilityFloor
          ? this.alpha * 0.45
          : this.alpha;

      return {
        x: prev.x + (landmark.x - prev.x) * a,
        y: prev.y + (landmark.y - prev.y) * a,
        z: prev.z + (landmark.z - prev.z) * a,
        visibility:
          (prev.visibility ?? 0) +
          (visibility - (prev.visibility ?? 0)) * Math.min(1, a + 0.15),
      };
    });

    this.previous = smoothed;
    return smoothed.map((landmark) => ({ ...landmark }));
  }

  reset() {
    this.previous = null;
  }
}
