export interface StablePoseState {
  acceptedSamples: number;
  requiredSamples: number;
  progress: number;
  complete: boolean;
}

/**
 * Устойчивый гейт захвата: короткие провалы кадров не сбрасывают прогресс сразу.
 * Нужно `requiredSamples` удачных оценок подряд с допуском `missTolerance` промахов.
 */
export class StablePoseGate {
  private acceptedSamples = 0;
  private missStreak = 0;

  constructor(
    private readonly requiredSamples = 18,
    private readonly missTolerance = 3,
  ) {}

  update(accepted: boolean): StablePoseState {
    if (accepted) {
      this.acceptedSamples += 1;
      this.missStreak = 0;
    } else {
      this.missStreak += 1;
      if (this.missStreak > this.missTolerance) {
        this.acceptedSamples = 0;
        this.missStreak = 0;
      }
    }

    const complete = this.acceptedSamples >= this.requiredSamples;

    return {
      acceptedSamples: this.acceptedSamples,
      requiredSamples: this.requiredSamples,
      progress: Math.min(1, this.acceptedSamples / this.requiredSamples),
      complete,
    };
  }

  reset() {
    this.acceptedSamples = 0;
    this.missStreak = 0;
  }
}
