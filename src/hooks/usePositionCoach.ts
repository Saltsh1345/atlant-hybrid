"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import {
  analyzePosition,
  type CoachContext,
  type PositionCoachResult,
  type PositionIssue,
} from "@/lib/camera/positionCoach";
import { detectDeviceKind } from "@/lib/camera/deviceProfile";
import { speakGuidance } from "@/lib/ai/speech";
import type { CameraCalibration } from "@/lib/camera/cameraCalibration";

const VOICE_COOLDOWN_MS = 9000;
const READY_HOLD_FRAMES = 12;
const PROGRESS_EPS = 0.03;

function coachContextKey(context: CoachContext | null): string {
  if (!context) return "";
  if (context.mode === "calibration") {
    return `cal:${context.step}:${context.sport ?? ""}`;
  }
  return `${context.mode}:${context.sport}:${context.exercise ?? ""}`;
}

function resultEqual(a: PositionCoachResult, b: PositionCoachResult): boolean {
  return (
    a.issue === b.issue &&
    a.ready === b.ready &&
    a.hint === b.hint &&
    a.detail === b.detail &&
    a.metrics === b.metrics &&
    Math.abs(a.progress - b.progress) < PROGRESS_EPS &&
    (a.distance?.meters ?? -1) === (b.distance?.meters ?? -1)
  );
}

export function usePositionCoach(
  landmarks: NormalizedLandmark[] | null,
  context: CoachContext | null,
  active: boolean,
  voiceEnabled = true,
  heightCm?: number,
  calibration?: CameraCalibration | null
): PositionCoachResult & { readyHeld: boolean } {
  const [result, setResult] = useState<PositionCoachResult>({
    issue: "no_body",
    ready: false,
    progress: 0,
    hint: "Встаньте в кадр",
    detail: "",
    metrics: "",
  });
  const [readyHeld, setReadyHeld] = useState(false);

  const lastIssueRef = useRef<PositionIssue | null>(null);
  const readyFramesRef = useRef(0);
  const readyHeldRef = useRef(false);
  const resultRef = useRef(result);
  const landmarksRef = useRef(landmarks);
  const contextRef = useRef(context);
  const heightRef = useRef(heightCm);
  const calibrationRef = useRef(calibration);
  landmarksRef.current = landmarks;
  contextRef.current = context;
  heightRef.current = heightCm;
  calibrationRef.current = calibration;
  resultRef.current = result;

  const contextKey = coachContextKey(context);

  useEffect(() => {
    if (!active || !context) {
      readyFramesRef.current = 0;
      lastIssueRef.current = null;
      if (readyHeldRef.current) {
        readyHeldRef.current = false;
        setReadyHeld(false);
      }
      return;
    }

    let raf: number;
    const loop = () => {
      const next = analyzePosition(
        landmarksRef.current,
        contextRef.current!,
        detectDeviceKind(),
        heightRef.current,
        calibrationRef.current
      );

      if (!resultEqual(resultRef.current, next)) {
        resultRef.current = next;
        setResult(next);
      }

      if (next.ready) {
        readyFramesRef.current += 1;
      } else {
        readyFramesRef.current = 0;
      }

      const shouldHold = readyFramesRef.current >= READY_HOLD_FRAMES;
      if (shouldHold !== readyHeldRef.current) {
        readyHeldRef.current = shouldHold;
        setReadyHeld(shouldHold);
      }

      if (voiceEnabled && next.issue !== lastIssueRef.current) {
        const key = `coach:${next.issue}:${contextRef.current?.mode}`;
        if (
          next.issue !== "ready" &&
          speakGuidance(key, next.hint, { cooldownMs: VOICE_COOLDOWN_MS })
        ) {
          lastIssueRef.current = next.issue;
        } else if (next.issue === "ready" && lastIssueRef.current !== "ready") {
          speakGuidance(`${key}:ok`, next.hint, { cooldownMs: 4000 });
          lastIssueRef.current = "ready";
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, contextKey, voiceEnabled]);

  return { ...result, readyHeld };
}
