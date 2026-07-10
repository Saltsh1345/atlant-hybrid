"use client";

import { useEffect, useRef } from "react";
import {
  VideoClipRecorder,
  blobToBase64,
} from "@/lib/camera/videoClipRecorder";
import {
  addSessionVideoClip,
  resetSessionVideoClips,
} from "@/lib/training/sessionVideoClips";
import type { DrillCommand, DrillPhase } from "@/lib/training/drillProtocol";
import { exerciseLabel } from "@/lib/pose/exercises";
import type { Sport, StrengthExercise } from "@/types";

interface CaptureOpts {
  sport: Sport;
  exercise?: StrengthExercise | null;
  countdownDone: boolean;
  isDrillSport: boolean;
  drillPhase: DrillPhase;
  drillCommand: DrillCommand | null;
  /** Last sensor reading when drill hit registered */
  lastHitHintRef?: React.RefObject<{
    speedMs: number;
    accuracy: number;
    elbowAngle: number;
    fixed: boolean;
  } | null>;
}

export function useSessionVideoCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  opts: CaptureOpts
) {
  const recorderRef = useRef<VideoClipRecorder | null>(null);
  const prevPhaseRef = useRef<DrillPhase>("idle");
  const strengthClipsRef = useRef(0);
  const strengthTimersRef = useRef<number[]>([]);
  const activeCommandRef = useRef<DrillCommand | null>(null);

  useEffect(() => {
    recorderRef.current = new VideoClipRecorder();
    resetSessionVideoClips();
    return () => {
      strengthTimersRef.current.forEach((t) => window.clearTimeout(t));
      strengthTimersRef.current = [];
      void recorderRef.current?.stop();
    };
  }, []);

  const persistClip = async (
    label: string,
    expectedAction: string,
    exercise?: StrengthExercise
  ) => {
    const recorded = await recorderRef.current?.stop();
    const video = videoRef.current;
    if (!recorded || recorded.blob.size < 1200) return;

    try {
      const base64 = await blobToBase64(recorded.blob);
      const previewFrameBase64 = video ? capturePreviewFrame(video) : undefined;
      addSessionVideoClip({
        sport: opts.sport,
        exercise,
        label,
        expectedAction,
        mimeType: recorded.mimeType,
        base64,
        previewFrameBase64,
        durationMs: recorded.durationMs,
        sensorHint: opts.lastHitHintRef?.current ?? undefined,
      });
    } catch {
      /* ignore encode errors */
    }
  };

  const startClip = () => {
    const video = videoRef.current;
    if (!video || recorderRef.current?.isRecording) return;
    recorderRef.current?.start(video);
  };

  // Drill sports: one clip per active command window
  useEffect(() => {
    if (!opts.countdownDone || !opts.isDrillSport) return;

    const prev = prevPhaseRef.current;
    const phase = opts.drillPhase;
    prevPhaseRef.current = phase;

    if (phase === "active" && prev !== "active" && opts.drillCommand) {
      activeCommandRef.current = opts.drillCommand;
      startClip();
      return;
    }

    if (
      prev === "active" &&
      phase !== "active" &&
      activeCommandRef.current
    ) {
      const cmd = activeCommandRef.current;
      activeCommandRef.current = null;
      void persistClip(cmd.text, cmd.type);
    }
  }, [
    opts.countdownDone,
    opts.isDrillSport,
    opts.drillPhase,
    opts.drillCommand,
  ]);

  // Strength: 2 clips — early + mid session
  useEffect(() => {
    if (!opts.countdownDone || opts.isDrillSport) return;

    const exercise = opts.exercise ?? "squat";
    const label = exerciseLabel(exercise);
    const action = exercise;

    if (strengthClipsRef.current >= 2) return;

    const schedule = (delayMs: number, slot: number) => {
      const t = window.setTimeout(() => {
        if (strengthClipsRef.current >= slot + 1) return;
        startClip();
        const stopT = window.setTimeout(() => {
          strengthClipsRef.current = Math.max(strengthClipsRef.current, slot + 1);
          void persistClip(
            slot === 0 ? `${label} · подход 1` : `${label} · подход 2`,
            action,
            exercise
          );
        }, 9000);
        strengthTimersRef.current.push(stopT);
      }, delayMs);
      strengthTimersRef.current.push(t);
    };

    schedule(1200, 0);
    schedule(22_000, 1);

    return () => {
      strengthTimersRef.current.forEach((id) => window.clearTimeout(id));
      strengthTimersRef.current = [];
    };
  }, [opts.countdownDone, opts.isDrillSport, opts.exercise, opts.sport]);
}

function capturePreviewFrame(video: HTMLVideoElement): string | undefined {
  if (video.videoWidth < 10 || video.videoHeight < 10) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(640, video.videoWidth);
  canvas.height = Math.round((canvas.width * video.videoHeight) / video.videoWidth);
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return undefined;
  return dataUrl.slice(idx + 1);
}
