/** Record short webcam clips via canvas (smaller payload for Gemini). */

export interface RecordedClip {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export class VideoClipRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private rafId = 0;
  private stream: MediaStream | null = null;
  private startedAt = 0;
  private active = false;

  constructor(
    private width = 480,
    private height = 360,
    private fps = 12
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d")!;
  }

  get isRecording(): boolean {
    return this.active;
  }

  start(video: HTMLVideoElement): boolean {
    if (this.active) return false;
    if (typeof MediaRecorder === "undefined") return false;

    const mime = pickMimeType();
    if (!mime) return false;

    const draw = () => {
      if (video.readyState >= 2) {
        this.ctx.drawImage(video, 0, 0, this.width, this.height);
      }
      this.rafId = requestAnimationFrame(draw);
    };
    draw();

    this.stream = this.canvas.captureStream(this.fps);
    this.chunks = [];
    this.startedAt = performance.now();

    try {
      this.recorder = new MediaRecorder(this.stream, {
        mimeType: mime,
        videoBitsPerSecond: 380_000,
      });
    } catch {
      cancelAnimationFrame(this.rafId);
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      return false;
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(300);
    this.active = true;
    return true;
  }

  async stop(): Promise<RecordedClip | null> {
    if (!this.active || !this.recorder) return null;
    this.active = false;
    cancelAnimationFrame(this.rafId);

    const recorder = this.recorder;
    const mimeType = recorder.mimeType || "video/webm";

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;
        this.recorder = null;
        this.chunks = [];
        if (blob.size < 800) {
          resolve(null);
          return;
        }
        resolve({
          blob,
          mimeType,
          durationMs: Math.round(performance.now() - this.startedAt),
        });
      };
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
  }
}

function pickMimeType(): string | null {
  const candidates = [
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
