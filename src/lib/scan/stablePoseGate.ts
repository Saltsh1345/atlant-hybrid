export interface StablePoseState {
  acceptedSamples: number;
  requiredSamples: number;
  progress: number;
  complete: boolean;
}

export class StablePoseGate {
  private acceptedSamples = 0;

  constructor(private readonly requiredSamples = 12) {}

  update(accepted: boolean): StablePoseState {
    this.acceptedSamples = accepted ? this.acceptedSamples + 1 : 0;
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
  }
}
