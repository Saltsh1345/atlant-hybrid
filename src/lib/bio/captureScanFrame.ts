/** Capture a JPEG frame from the live webcam (client-only). */
export function captureVideoFrameJpeg(
  video: HTMLVideoElement,
  maxWidth = 480
): string | null {
  if (video.readyState < 2 || !video.videoWidth) return null;

  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  return dataUrl.split(",")[1] ?? null;
}

export type ScanViewKey = "front" | "side" | "back" | "full_body";

export interface ScanKeyframes {
  front?: string;
  side?: string;
  back?: string;
  full_body?: string;
}

export function listCapturedViews(frames: ScanKeyframes): ScanViewKey[] {
  return (Object.keys(frames) as ScanViewKey[]).filter((k) => !!frames[k]);
}
