"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import type { Sport } from "@/types";
import type { FrameDistance } from "@/lib/camera/autoFrame";
import {
  computeAutoFrame,
  lerpFrame,
  shouldNudgeDistance,
  nudgeMessage,
  type AutoFrameTarget,
} from "@/lib/camera/autoFrame";
import { speakGuidance } from "@/lib/ai/speech";

const SMOOTH = 0.14;
const NUDGE_COOLDOWN_MS = 15000;

function frameEqual(a: AutoFrameTarget, b: AutoFrameTarget): boolean {
  return (
    a.scale === b.scale &&
    a.originX === b.originX &&
    a.originY === b.originY &&
    a.distance === b.distance &&
    a.hint === b.hint &&
    a.bodyHeight === b.bodyHeight
  );
}

export function useAutoFrame(
  landmarks: NormalizedLandmark[] | null,
  active: boolean,
  sport?: Sport,
  voiceNudges = true
): AutoFrameTarget {
  const landmarksRef = useRef(landmarks);
  const voiceNudgesRef = useRef(voiceNudges);
  landmarksRef.current = landmarks;
  voiceNudgesRef.current = voiceNudges;

  const smoothRef = useRef<AutoFrameTarget>(computeAutoFrame(null, sport));
  const [frame, setFrame] = useState<AutoFrameTarget>(smoothRef.current);
  const spokenDistanceRef = useRef<FrameDistance | null>(null);

  useEffect(() => {
    if (!active) {
      const neutral = computeAutoFrame(null, sport);
      smoothRef.current = neutral;
      setFrame(neutral);
      spokenDistanceRef.current = null;
      return;
    }

    let raf: number;
    const loop = () => {
      const next = computeAutoFrame(landmarksRef.current, sport);
      smoothRef.current = lerpFrame(smoothRef.current, next, SMOOTH);
      const smoothed = smoothRef.current;

      setFrame((prev) =>
        frameEqual(prev, smoothed) ? prev : { ...smoothed }
      );

      if (voiceNudgesRef.current) {
        if (next.distance === "ok" || next.distance === "searching") {
          spokenDistanceRef.current = null;
        } else if (
          shouldNudgeDistance(next.distance) &&
          spokenDistanceRef.current !== next.distance
        ) {
          const msg = nudgeMessage(next.distance);
          if (
            msg &&
            speakGuidance(`autoframe:${next.distance}`, msg, {
              cooldownMs: NUDGE_COOLDOWN_MS,
            })
          ) {
            spokenDistanceRef.current = next.distance;
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, sport]);

  return frame;
}
