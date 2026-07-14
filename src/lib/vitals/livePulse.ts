import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";

export type PulseSignalSource = "camera" | "kinematics" | "health" | "none";

export interface PulseEstimate {
  bpm: number;
  confidence: number;
  source: PulseSignalSource;
}

const BUFFER_SEC = 4.2;
const MIN_BPM = 48;
const MAX_BPM = 175;
const SAMPLE_INTERVAL_MS = 33;

/**
 * Best-effort webcam pulse from green-channel ROI (forehead / cheek).
 * Not medical-grade — labeled as camera estimate in UI.
 */
export class LivePulseEstimator {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private times: number[] = [];
  private greens: number[] = [];
  private lastSampleAt = 0;
  private smoothedBpm = 72;
  private lastGoodAt = 0;

  reset(resting = 72): void {
    this.times = [];
    this.greens = [];
    this.lastSampleAt = 0;
    this.smoothedBpm = resting;
    this.lastGoodAt = 0;
  }

  /**
   * Sample skin ROI from live video using pose face landmarks.
   * Returns null when ROI is weak / not enough history.
   */
  sample(
    video: HTMLVideoElement | null,
    landmarks: NormalizedLandmark[] | null,
    now = performance.now()
  ): PulseEstimate | null {
    if (!video || !landmarks || video.readyState < 2) return null;
    if (now - this.lastSampleAt < SAMPLE_INTERVAL_MS) {
      return this.lastGoodAt
        ? {
            bpm: Math.round(this.smoothedBpm),
            confidence: this.confidenceAt(now),
            source: "camera",
          }
        : null;
    }
    this.lastSampleAt = now;

    const roi = this.faceRoi(landmarks);
    if (!roi) return null;

    const green = this.readGreen(video, roi);
    if (green == null) return null;

    this.times.push(now);
    this.greens.push(green);

    const cutoff = now - BUFFER_SEC * 1000;
    while (this.times.length && this.times[0]! < cutoff) {
      this.times.shift();
      this.greens.shift();
    }

    if (this.times.length < 45) return null;

    const bpm = this.estimateBpmFromBuffer();
    if (bpm == null) return null;

    const alpha = 0.22;
    this.smoothedBpm += (bpm - this.smoothedBpm) * alpha;
    this.lastGoodAt = now;

    return {
      bpm: Math.round(this.smoothedBpm),
      confidence: this.confidenceAt(now),
      source: "camera",
    };
  }

  private confidenceAt(now: number): number {
    if (!this.lastGoodAt) return 0;
    const age = now - this.lastGoodAt;
    if (age > 2500) return 0;
    const fill = Math.min(1, this.greens.length / 90);
    return Math.max(0, (1 - age / 2500) * fill);
  }

  private faceRoi(
    lm: NormalizedLandmark[]
  ): { nx: number; ny: number; nw: number; nh: number } | null {
    const nose = lm[LM.NOSE];
    const lShoulder = lm[LM.L_SHOULDER];
    const rShoulder = lm[LM.R_SHOULDER];
    // Pose face: left eye outer ≈ 3, right eye outer ≈ 6 (MediaPipe Pose)
    const lEye = lm[3] ?? lm[2];
    const rEye = lm[6] ?? lm[5];

    if (!nose || (nose.visibility ?? 0) < 0.45) return null;

    const eyeMidX =
      lEye && rEye ? (lEye.x + rEye.x) / 2 : nose.x;
    const eyeMidY =
      lEye && rEye ? (lEye.y + rEye.y) / 2 : nose.y - 0.04;

    // Forehead band above eyes; fallback cheek if forehead off-frame
    let cx = eyeMidX;
    let cy = eyeMidY - Math.abs((nose.y - eyeMidY) * 0.9 + 0.02);
    if (cy < 0.02) {
      cx = nose.x;
      cy = Math.min(0.55, nose.y + 0.03);
    }

    const shoulderW =
      lShoulder && rShoulder
        ? Math.abs(lShoulder.x - rShoulder.x)
        : 0.18;
    const nw = Math.min(0.14, Math.max(0.045, shoulderW * 0.28));
    const nh = nw * 0.75;

    if (cx - nw / 2 < 0 || cx + nw / 2 > 1 || cy - nh / 2 < 0 || cy + nh / 2 > 1) {
      return null;
    }

    return { nx: cx - nw / 2, ny: cy - nh / 2, nw, nh };
  }

  private readGreen(
    video: HTMLVideoElement,
    roi: { nx: number; ny: number; nw: number; nh: number }
  ): number | null {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", {
        willReadFrequently: true,
      });
    }
    if (!this.ctx) return null;

    // sample small patch (mirrored video is CSS-only; landmarks match raw frames)
    const sx = Math.floor(roi.nx * vw);
    const sy = Math.floor(roi.ny * vh);
    const sw = Math.max(4, Math.floor(roi.nw * vw));
    const sh = Math.max(4, Math.floor(roi.nh * vh));

    this.canvas.width = sw;
    this.canvas.height = sh;
    try {
      this.ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
      const data = this.ctx.getImageData(0, 0, sw, sh).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 16) {
        sum += data[i + 1]!; // green
        n++;
      }
      return n ? sum / n : null;
    } catch {
      return null;
    }
  }

  private estimateBpmFromBuffer(): number | null {
    const n = this.greens.length;
    if (n < 45) return null;

    // Detrend with moving average (~0.75s window)
    const win = Math.max(5, Math.round(n * 0.18));
    const detrended: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      let c = 0;
      for (let j = i - win; j <= i + win; j++) {
        if (j < 0 || j >= n) continue;
        s += this.greens[j]!;
        c++;
      }
      detrended[i] = this.greens[i]! - s / c;
    }

    const durationSec =
      (this.times[n - 1]! - this.times[0]!) / 1000;
    if (durationSec < 2.2) return null;

    // Peak pick on positive lobes
    const mean =
      detrended.reduce((a, b) => a + Math.abs(b), 0) / n;
    const thresh = mean * 0.55;
    const peaks: number[] = [];
    for (let i = 2; i < n - 2; i++) {
      const v = detrended[i]!;
      if (
        v > thresh &&
        v >= detrended[i - 1]! &&
        v >= detrended[i + 1]! &&
        v >= detrended[i - 2]! &&
        v >= detrended[i + 2]!
      ) {
        const t = this.times[i]!;
        if (!peaks.length || t - peaks[peaks.length - 1]! > 320) {
          peaks.push(t);
        }
      }
    }

    if (peaks.length < 3) return null;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i]! - peaks[i - 1]!);
    }
    intervals.sort((a, b) => a - b);
    const mid = intervals[Math.floor(intervals.length / 2)]!;
    if (mid < 340 || mid > 1250) return null;

    const bpm = 60000 / mid;
    if (bpm < MIN_BPM || bpm > MAX_BPM) return null;

    // Regularity → reject chaotic lighting
    const mad =
      intervals.reduce((a, b) => a + Math.abs(b - mid), 0) /
      intervals.length;
    if (mad > mid * 0.35) return null;

    return bpm;
  }
}

/** Smooth kinematics HR so resting / movement transitions feel live. */
export function smoothKinematicPulse(
  prev: number,
  velocityMs: number,
  fatiguePercent: number,
  restingBpm: number,
  personPresent: boolean
): number {
  if (!personPresent) {
    return prev + (restingBpm - prev) * 0.04;
  }
  const activity = Math.min(1.6, Math.max(0, velocityMs) * 0.55);
  const elev = activity * 38 + fatiguePercent * 0.22;
  const target = Math.min(
    MAX_BPM,
    Math.max(MIN_BPM, restingBpm + elev)
  );
  // asymmetric: rise faster than fall (physiologically familiar)
  const alpha = target > prev ? 0.18 : 0.08;
  return prev + (target - prev) * alpha;
}

export function computeLiveStress(opts: {
  bpm: number;
  restingBpm: number;
  fatiguePercent: number;
  velocityMs: number;
  healthStress: number | null;
  personPresent: boolean;
  prev: number;
}): number {
  if (!opts.personPresent) {
    return opts.prev + (22 - opts.prev) * 0.05;
  }

  const hrElev = Math.max(
    0,
    Math.min(1, (opts.bpm - opts.restingBpm) / 55)
  );
  const motion = Math.max(
    0,
    Math.min(1, opts.velocityMs / 1.8)
  );
  const fatigue = Math.max(0, Math.min(1, opts.fatiguePercent / 100));

  let raw =
    fatigue * 32 + hrElev * 48 + motion * 20;

  if (opts.healthStress != null) {
    raw = opts.healthStress * 0.55 + raw * 0.45;
  }

  const target = Math.max(5, Math.min(95, raw));
  return opts.prev + (target - opts.prev) * 0.16;
}
