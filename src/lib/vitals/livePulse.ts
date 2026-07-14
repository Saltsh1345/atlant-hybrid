import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";

export type PulseSignalSource = "camera" | "kinematics" | "health" | "none";

/** Camera rPPG pipeline status for UI (honest, non-medical). */
export type RppgCamStatus =
  | "no_face"
  | "accumulating"
  | "refining"
  | "low_light"
  | "motion"
  | "weak"
  | "ok";

export interface FaceRoiNorm {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
}

export interface PulseEstimate {
  bpm: number;
  confidence: number;
  source: PulseSignalSource;
  status: RppgCamStatus;
  /** Forehead/cheek patch in normalized video coords (raw, not CSS-mirrored). */
  roi: FaceRoiNorm | null;
}

/** Rolling window kept for refining (longer = stabler, slower fill score). */
const BUFFER_SEC = 18;
/** Seconds of face samples before first spectral BPM attempt. */
const MIN_HISTORY_SEC = 6;
/** Confidence fill reaches 1.0 by this duration (buffer still grows to BUFFER_SEC). */
const FILL_REF_SEC = 12;
/** ~6 s at ≥12 Hz sampling. */
const MIN_SAMPLES = 72;
const MIN_BPM = 42;
const MAX_BPM = 180;
const BAND_HZ_LO = 0.7;
const BAND_HZ_HI = 3.0;
const SAMPLE_INTERVAL_MS = 33;
/**
 * Provisional camera lock — show early rPPG BPM while still refining.
 * Below this, prefer kinematics/Health.
 */
export const RPPG_PROVISIONAL_CONFIDENCE = 0.28;
/** Full-trust threshold for stable camera rPPG (slightly easier early lock). */
export const RPPG_TRUST_CONFIDENCE = 0.38;

const POSE_L_EYE = 2;
const POSE_R_EYE = 5;
const POSE_L_EYE_OUTER = 3;
const POSE_R_EYE_OUTER = 6;
const POSE_L_EAR = 7;
const POSE_R_EAR = 8;

function vis(lm: NormalizedLandmark | undefined, min = 0.35): boolean {
  return !!lm && (lm.visibility ?? 0) >= min;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function std(values: number[], mu?: number): number {
  if (values.length < 2) return 0;
  const m = mu ?? mean(values);
  let s = 0;
  for (const v of values) {
    const d = v - m;
    s += d * d;
  }
  return Math.sqrt(s / (values.length - 1));
}

/** Hann window */
function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  if (n <= 1) {
    w[0] = 1;
    return w;
  }
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

/**
 * Real DFT magnitude spectrum for freqs in [lo, hi] Hz.
 * Returns peak frequency (Hz), peak power, and mean power in band (for SNR).
 */
function spectralPeakHz(
  signal: Float64Array,
  fs: number,
  loHz: number,
  hiHz: number
): { hz: number; peakPower: number; bandMean: number } | null {
  const n = signal.length;
  if (n < 32 || fs <= 0) return null;

  const window = hann(n);
  let wSum = 0;
  for (let i = 0; i < n; i++) wSum += window[i]!;
  const wNorm = wSum || 1;

  const kMin = Math.max(1, Math.floor((loHz * n) / fs));
  const kMax = Math.min(Math.floor(n / 2) - 1, Math.ceil((hiHz * n) / fs));
  if (kMax <= kMin) return null;

  let bestK = kMin;
  let bestP = -1;
  let bandSum = 0;
  let bandCount = 0;

  for (let k = kMin; k <= kMax; k++) {
    let re = 0;
    let im = 0;
    const omega = (2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      const v = (signal[t]! * window[t]!) / wNorm;
      re += v * Math.cos(omega * t);
      im -= v * Math.sin(omega * t);
    }
    const p = re * re + im * im;
    bandSum += p;
    bandCount++;
    if (p > bestP) {
      bestP = p;
      bestK = k;
    }
  }

  if (bestP <= 0 || bandCount < 3) return null;

  // Parabolic interpolation around peak for sub-bin Hz
  const p0 = bestK > kMin ? dftPower(signal, window, wNorm, bestK - 1, n) : bestP;
  const p1 = bestP;
  const p2 = bestK < kMax ? dftPower(signal, window, wNorm, bestK + 1, n) : bestP;
  let delta = 0;
  const denom = 2 * (2 * p1 - p0 - p2);
  if (Math.abs(denom) > 1e-12) {
    delta = clamp((p0 - p2) / denom, -0.5, 0.5);
  }
  const hz = ((bestK + delta) * fs) / n;
  return { hz, peakPower: bestP, bandMean: bandSum / bandCount };
}

function dftPower(
  signal: Float64Array,
  window: Float64Array,
  wNorm: number,
  k: number,
  n: number
): number {
  let re = 0;
  let im = 0;
  const omega = (2 * Math.PI * k) / n;
  for (let t = 0; t < n; t++) {
    const v = (signal[t]! * window[t]!) / wNorm;
    re += v * Math.cos(omega * t);
    im -= v * Math.sin(omega * t);
  }
  return re * re + im * im;
}

/**
 * Best-effort webcam pulse from multi-ROI green-channel rPPG.
 * Not a medical device — UI must label as camera estimate.
 */
export class LivePulseEstimator {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private times: number[] = [];
  private greens: number[] = [];
  private noseX: number[] = [];
  private noseY: number[] = [];
  private lastSampleAt = 0;
  private smoothedBpm = 72;
  private lastGoodAt = 0;
  private lastConfidence = 0;
  private lastStatus: RppgCamStatus = "no_face";
  private lastRoi: FaceRoiNorm | null = null;
  private recentBpms: number[] = [];
  private lastEstimateAt = 0;

  reset(resting = 72): void {
    this.times = [];
    this.greens = [];
    this.noseX = [];
    this.noseY = [];
    this.lastSampleAt = 0;
    this.smoothedBpm = resting;
    this.lastGoodAt = 0;
    this.lastConfidence = 0;
    this.lastStatus = "no_face";
    this.lastRoi = null;
    this.recentBpms = [];
    this.lastEstimateAt = 0;
  }

  getLastRoi(): FaceRoiNorm | null {
    return this.lastRoi;
  }

  getStatus(): RppgCamStatus {
    return this.lastStatus;
  }

  getConfidence(): number {
    return this.lastConfidence;
  }

  /**
   * Sample skin ROI from live video using pose face landmarks.
   * Always updates status; returns a PulseEstimate when a BPM can be shown
   * (including during accumulation with decaying prior).
   */
  sample(
    video: HTMLVideoElement | null,
    landmarks: NormalizedLandmark[] | null,
    now = performance.now()
  ): PulseEstimate {
    if (!video || !landmarks || video.readyState < 2) {
      this.lastStatus = "no_face";
      this.lastConfidence = 0;
      this.lastRoi = null;
      return this.snapshot("none", now);
    }

    if (now - this.lastSampleAt < SAMPLE_INTERVAL_MS) {
      return this.snapshot("camera", now);
    }
    this.lastSampleAt = now;

    const rois = this.faceRois(landmarks);
    if (!rois.length) {
      this.lastStatus = "no_face";
      this.lastConfidence = Math.max(0, this.lastConfidence * 0.92);
      this.lastRoi = null;
      return this.snapshot("none", now);
    }

    const nose = landmarks[LM.NOSE];
    this.lastRoi = this.unionRoi(rois);

    const green = this.readGreenMulti(video, rois);
    if (green == null) {
      this.lastStatus = "low_light";
      this.lastConfidence = Math.max(0, this.lastConfidence * 0.9);
      return this.snapshot("camera", now);
    }

    // Very dark / flat patch → little pulsatile content possible
    if (green < 18) {
      this.lastStatus = "low_light";
      this.lastConfidence = Math.max(0, this.lastConfidence * 0.88);
      this.pushSample(now, green, nose);
      return this.snapshot("camera", now);
    }

    this.pushSample(now, green, nose);

    const historySec = this.historyDurationSec();
    if (historySec < MIN_HISTORY_SEC || this.greens.length < MIN_SAMPLES) {
      this.lastStatus = "accumulating";
      const fill = clamp(historySec / MIN_HISTORY_SEC, 0, 1);
      this.lastConfidence = fill * 0.22;
      return this.snapshot("camera", now);
    }

    const motion = this.motionScore(now);
    if (motion > 0.045) {
      this.lastStatus = "motion";
      this.lastConfidence = Math.min(this.lastConfidence, 0.26);
      // Still try estimate, but confidence stays low → kinematics preferred
      if (now - this.lastEstimateAt < 400) {
        return this.snapshot("camera", now);
      }
    }

    // Throttle heavy spectral work ~2.5 Hz while sampling at 30 Hz
    if (now - this.lastEstimateAt < 400) {
      return this.snapshot("camera", now);
    }
    this.lastEstimateAt = now;

    const result = this.estimateFromBuffer(motion);
    if (!result) {
      if (this.lastStatus !== "motion" && this.lastStatus !== "low_light") {
        this.lastStatus = historySec < FILL_REF_SEC ? "accumulating" : "weak";
      }
      this.lastConfidence = Math.max(0.1, this.lastConfidence * 0.85);
      return this.snapshot("camera", now);
    }

    const { bpm, snr, confidence } = result;
    this.recentBpms.push(bpm);
    while (this.recentBpms.length > 7) this.recentBpms.shift();
    const med = median(this.recentBpms) ?? bpm;

    // Soft clamp jumps vs prior smoothed value
    const maxStep = this.lastGoodAt && now - this.lastGoodAt < 3000 ? 12 : 28;
    const stepped = clamp(med, this.smoothedBpm - maxStep, this.smoothedBpm + maxStep);
    const alpha = confidence >= 0.55 ? 0.28 : confidence >= RPPG_PROVISIONAL_CONFIDENCE ? 0.2 : 0.14;
    this.smoothedBpm += (stepped - this.smoothedBpm) * alpha;

    this.lastGoodAt = now;
    this.lastConfidence = confidence;
    this.lastStatus =
      confidence >= RPPG_TRUST_CONFIDENCE
        ? "ok"
        : confidence >= RPPG_PROVISIONAL_CONFIDENCE
          ? "refining"
          : motion > 0.035
            ? "motion"
            : snr < 1.6
              ? "weak"
              : "accumulating";

    return this.snapshot("camera", now);
  }

  private snapshot(source: PulseSignalSource, now: number): PulseEstimate {
    const ageDecay =
      this.lastGoodAt > 0
        ? clamp(1 - (now - this.lastGoodAt) / 4000, 0, 1)
        : 0;
    const conf =
      source === "none"
        ? 0
        : this.lastConfidence * (0.55 + 0.45 * ageDecay);

    return {
      bpm: Math.round(this.smoothedBpm),
      confidence: conf,
      source: source === "none" ? "none" : "camera",
      status: this.lastStatus,
      roi: this.lastRoi,
    };
  }

  private pushSample(
    now: number,
    green: number,
    nose: NormalizedLandmark | undefined
  ): void {
    this.times.push(now);
    this.greens.push(green);
    this.noseX.push(nose?.x ?? 0.5);
    this.noseY.push(nose?.y ?? 0.5);

    const cutoff = now - BUFFER_SEC * 1000;
    while (this.times.length && this.times[0]! < cutoff) {
      this.times.shift();
      this.greens.shift();
      this.noseX.shift();
      this.noseY.shift();
    }
  }

  private historyDurationSec(): number {
    const n = this.times.length;
    if (n < 2) return 0;
    return (this.times[n - 1]! - this.times[0]!) / 1000;
  }

  /** RMS nose displacement per sample over ~2s (normalized coords). */
  private motionScore(now: number): number {
    const n = this.times.length;
    if (n < 10) return 0;
    const from = now - 2000;
    let i0 = 0;
    while (i0 < n && this.times[i0]! < from) i0++;
    if (n - i0 < 8) return 0;

    let sum = 0;
    let c = 0;
    for (let i = i0 + 1; i < n; i++) {
      const dx = this.noseX[i]! - this.noseX[i - 1]!;
      const dy = this.noseY[i]! - this.noseY[i - 1]!;
      sum += dx * dx + dy * dy;
      c++;
    }
    return c ? Math.sqrt(sum / c) : 0;
  }

  private faceRois(lm: NormalizedLandmark[]): FaceRoiNorm[] {
    const nose = lm[LM.NOSE];
    if (!vis(nose, 0.4)) return [];

    const lEye =
      (vis(lm[POSE_L_EYE_OUTER]) ? lm[POSE_L_EYE_OUTER] : null) ??
      (vis(lm[POSE_L_EYE]) ? lm[POSE_L_EYE] : null);
    const rEye =
      (vis(lm[POSE_R_EYE_OUTER]) ? lm[POSE_R_EYE_OUTER] : null) ??
      (vis(lm[POSE_R_EYE]) ? lm[POSE_R_EYE] : null);
    const lEar = vis(lm[POSE_L_EAR], 0.25) ? lm[POSE_L_EAR]! : null;
    const rEar = vis(lm[POSE_R_EAR], 0.25) ? lm[POSE_R_EAR]! : null;

    const eyeMidX =
      lEye && rEye ? (lEye.x + rEye.x) / 2 : nose!.x;
    const eyeMidY =
      lEye && rEye ? (lEye.y + rEye.y) / 2 : nose!.y - 0.04;
    const eyeSpan =
      lEye && rEye ? Math.abs(rEye.x - lEye.x) : 0.08;
    const faceW = Math.max(
      eyeSpan * 1.35,
      lEar && rEar ? Math.abs(rEar.x - lEar.x) * 0.55 : eyeSpan * 1.2,
      0.06
    );

    const rois: FaceRoiNorm[] = [];

    // Forehead band above eyes
    {
      const nw = clamp(faceW * 0.85, 0.05, 0.16);
      const nh = nw * 0.55;
      const cx = eyeMidX;
      const cy = eyeMidY - Math.max(0.025, eyeSpan * 0.55);
      const roi = this.clampRoi(cx - nw / 2, cy - nh / 2, nw, nh);
      if (roi) rois.push(roi);
    }

    // Left / right cheek (nose–ear midline), avoid torso
    const cheekY = clamp(nose!.y + eyeSpan * 0.15, 0.08, 0.72);
    const cheekH = clamp(faceW * 0.42, 0.035, 0.09);
    const cheekW = clamp(faceW * 0.38, 0.03, 0.08);

    if (lEar || lEye) {
      const cx = lEar
        ? (nose!.x + lEar.x) / 2
        : nose!.x - faceW * 0.35;
      const roi = this.clampRoi(cx - cheekW / 2, cheekY - cheekH / 2, cheekW, cheekH);
      if (roi) rois.push(roi);
    }
    if (rEar || rEye) {
      const cx = rEar
        ? (nose!.x + rEar.x) / 2
        : nose!.x + faceW * 0.35;
      const roi = this.clampRoi(cx - cheekW / 2, cheekY - cheekH / 2, cheekW, cheekH);
      if (roi) rois.push(roi);
    }

    // If only nose was strong, cheek/forehead may fail — use compact nose/forehead fallback
    if (!rois.length) {
      const nw = 0.07;
      const nh = 0.055;
      const fallback = this.clampRoi(
        nose!.x - nw / 2,
        Math.max(0.02, eyeMidY - nh * 0.8) - nh / 2,
        nw,
        nh
      );
      if (fallback) rois.push(fallback);
    }

    return rois;
  }

  private clampRoi(
    nx: number,
    ny: number,
    nw: number,
    nh: number
  ): FaceRoiNorm | null {
    if (nw < 0.02 || nh < 0.015) return null;
    const x0 = clamp(nx, 0, 1 - nw);
    const y0 = clamp(ny, 0, 1 - nh);
    if (x0 < 0 || y0 < 0 || x0 + nw > 1 || y0 + nh > 1) return null;
    // Reject lower-body / torso patches (should stay in upper face)
    if (y0 + nh > 0.78) return null;
    return { nx: x0, ny: y0, nw, nh };
  }

  private unionRoi(rois: FaceRoiNorm[]): FaceRoiNorm | null {
    if (!rois.length) return null;
    let x0 = 1;
    let y0 = 1;
    let x1 = 0;
    let y1 = 0;
    for (const r of rois) {
      x0 = Math.min(x0, r.nx);
      y0 = Math.min(y0, r.ny);
      x1 = Math.max(x1, r.nx + r.nw);
      y1 = Math.max(y1, r.ny + r.nh);
    }
    return { nx: x0, ny: y0, nw: x1 - x0, nh: y1 - y0 };
  }

  private readGreenMulti(
    video: HTMLVideoElement,
    rois: FaceRoiNorm[]
  ): number | null {
    const values: number[] = [];
    for (const roi of rois) {
      const g = this.readGreen(video, roi);
      if (g != null) values.push(g);
    }
    if (!values.length) return null;
    return mean(values);
  }

  private readGreen(
    video: HTMLVideoElement,
    roi: FaceRoiNorm
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
      // Stride sampling for speed
      for (let i = 0; i < data.length; i += 16) {
        sum += data[i + 1]!;
        n++;
      }
      return n ? sum / n : null;
    } catch {
      return null;
    }
  }

  private estimateFromBuffer(
    motion: number
  ): { bpm: number; snr: number; confidence: number } | null {
    const n = this.greens.length;
    if (n < 90) return null;

    const t0 = this.times[0]!;
    const t1 = this.times[n - 1]!;
    const durationSec = (t1 - t0) / 1000;
    if (durationSec < MIN_HISTORY_SEC) return null;

    const fs = (n - 1) / durationSec;
    if (fs < 12 || fs > 45) return null;

    // Detrend: subtract long moving average (~1.4 s) → high-pass-ish
    const win = Math.max(5, Math.round(fs * 1.4));
    const detrended = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      let c = 0;
      const a = Math.max(0, i - win);
      const b = Math.min(n - 1, i + win);
      for (let j = a; j <= b; j++) {
        s += this.greens[j]!;
        c++;
      }
      detrended[i] = this.greens[i]! - s / c;
    }

    // Light bandpass via short MA difference (~0.7–3 Hz approximation)
    const short = Math.max(2, Math.round(fs / (2 * BAND_HZ_HI)));
    const long = Math.max(short + 1, Math.round(fs / (2 * BAND_HZ_LO)));
    const banded = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sShort = 0;
      let cShort = 0;
      let sLong = 0;
      let cLong = 0;
      for (let j = i - short; j <= i + short; j++) {
        if (j < 0 || j >= n) continue;
        sShort += detrended[j]!;
        cShort++;
      }
      for (let j = i - long; j <= i + long; j++) {
        if (j < 0 || j >= n) continue;
        sLong += detrended[j]!;
        cLong++;
      }
      banded[i] =
        (cShort ? sShort / cShort : 0) - (cLong ? sLong / cLong : 0);
    }

    // Use last ~14 s for spectrum (cap length for DFT cost)
    const maxSamples = Math.min(n, Math.floor(fs * 14));
    const off = n - maxSamples;
    const segment = banded.subarray(off);

    const spectral = spectralPeakHz(segment, fs, BAND_HZ_LO, BAND_HZ_HI);
    if (!spectral) return null;

    const bpmFft = spectral.hz * 60;
    if (bpmFft < MIN_BPM || bpmFft > MAX_BPM) return null;

    const snr = spectral.peakPower / Math.max(1e-12, spectral.bandMean);
    if (snr < 1.35) return null;

    // Peak-interval check as consistency vote
    const peakBpm = this.peakIntervalBpm(banded, this.times, fs);
    let bpm = bpmFft;
    if (peakBpm != null) {
      const delta = Math.abs(peakBpm - bpmFft);
      if (delta < 12) {
        bpm = 0.65 * bpmFft + 0.35 * peakBpm;
      } else if (delta > 25 && snr < 2.2) {
        // Discordant weak spectrum → distrust
        return null;
      }
    }

    const fill = clamp(durationSec / BUFFER_SEC, 0, 1);
    const snrScore = clamp((snr - 1.35) / 2.4, 0, 1);
    const motionPen = clamp(1 - motion / 0.05, 0, 1);
    const greenMu = mean(this.greens);
    const greenSd = std(this.greens, greenMu);
    const ampScore = clamp(greenSd / 2.5, 0, 1);
    const lightScore = greenMu < 22 ? 0.25 : greenMu > 40 ? 1 : 0.55;

    const confidence = clamp(
      0.22 * fill +
        0.38 * snrScore +
        0.22 * motionPen +
        0.1 * ampScore +
        0.08 * lightScore,
      0,
      0.95
    );

    if (motion > 0.045) {
      return { bpm, snr, confidence: Math.min(confidence, 0.32) };
    }

    return { bpm, snr, confidence };
  }

  private peakIntervalBpm(
    signal: Float64Array,
    times: number[],
    fs: number
  ): number | null {
    const n = signal.length;
    if (n < 60) return null;

    const absMean =
      signal.reduce((a, b) => a + Math.abs(b), 0) / n;
    const thresh = absMean * 0.5;
    const minGap = 60000 / MAX_BPM;
    const maxGap = 60000 / MIN_BPM;
    const peaks: number[] = [];

    for (let i = 2; i < n - 2; i++) {
      const v = signal[i]!;
      if (
        v > thresh &&
        v >= signal[i - 1]! &&
        v >= signal[i + 1]! &&
        v >= signal[i - 2]! &&
        v >= signal[i + 2]!
      ) {
        const t = times[times.length - n + i]!;
        if (!peaks.length || t - peaks[peaks.length - 1]! > minGap) {
          peaks.push(t);
        }
      }
    }

    if (peaks.length < 4) return null;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const d = peaks[i]! - peaks[i - 1]!;
      if (d >= minGap && d <= maxGap) intervals.push(d);
    }
    if (intervals.length < 3) return null;

    const mid = median(intervals);
    if (mid == null) return null;
    const mad =
      intervals.reduce((a, b) => a + Math.abs(b - mid), 0) / intervals.length;
    if (mad > mid * 0.32) return null;

    const bpm = 60000 / mid;
    if (bpm < MIN_BPM || bpm > MAX_BPM) return null;
    // fs unused but keeps API honest for future spacing checks
    void fs;
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
  const motion = Math.max(0, Math.min(1, opts.velocityMs / 1.8));
  const fatigue = Math.max(0, Math.min(1, opts.fatiguePercent / 100));

  let raw = fatigue * 32 + hrElev * 48 + motion * 20;

  if (opts.healthStress != null) {
    raw = opts.healthStress * 0.55 + raw * 0.45;
  }

  const target = Math.max(5, Math.min(95, raw));
  return opts.prev + (target - opts.prev) * 0.16;
}

/** Russian UI strings for camera rPPG status. */
export function rppgStatusHint(
  status: RppgCamStatus,
  trusted: boolean
): string {
  switch (status) {
    case "no_face":
      return "человек не в кадре";
    case "accumulating":
      return "камера · накопление сигнала…";
    case "refining":
      return "камера · ранняя оценка, уточняем…";
    case "low_light":
      return "мало света · оценка ограничена";
    case "motion":
      return "движение · подождите неподвижности";
    case "weak":
      return "камера · слабый сигнал (не мед.)";
    case "ok":
      return trusted
        ? "камера · rPPG (не мед. устройство)"
        : "камера · сигнал слабый (не мед.)";
    default:
      return "нет сигнала";
  }
}
