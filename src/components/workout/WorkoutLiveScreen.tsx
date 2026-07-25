"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import { useCameraDevice } from "@/hooks/useCameraDevice";
import { usePoseTracker } from "@/hooks/usePoseTracker";
import { angle, LM } from "@/lib/pose/landmarks";
import { exerciseById } from "@/lib/training/exerciseCatalog";
import { createGestureStateMachine } from "@/lib/workout/gestureStateMachine";
import { detectWorkoutGesture, warmHandLandmarker } from "@/lib/workout/gestureDetector";
import { loadWorkoutProfile, type WorkoutProfile } from "@/lib/workout/loadWorkoutProfile";
import { persistWorkoutSession } from "@/lib/workout/persistWorkoutSession";
import { createVerticalVbtTracker } from "@/lib/workout/vbtFatigue";
import { useWorkoutStore } from "@/store/workoutStore";
import type { NormalizedLandmark } from "@/types";
import type { WorkoutAngles } from "@/lib/workout/types";
import WorkoutAtlasPanel from "@/components/workout/WorkoutAtlasPanel";
import WorkoutHUD from "@/components/workout/WorkoutHUD";
import WorkoutPoseOverlay from "@/components/workout/WorkoutPoseOverlay";

const EMPTY_ANGLES: WorkoutAngles = {
  leftElbow: null,
  rightElbow: null,
  leftKnee: null,
  rightKnee: null,
};

function calculateAngles(landmarks: NormalizedLandmark[] | null): WorkoutAngles {
  if (!landmarks) return EMPTY_ANGLES;
  const get = (a: number, b: number, c: number) =>
    landmarks[a] && landmarks[b] && landmarks[c]
      ? angle(landmarks[a], landmarks[b], landmarks[c])
      : null;
  return {
    leftElbow: get(LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST),
    rightElbow: get(LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST),
    leftKnee: get(LM.L_HIP, LM.L_KNEE, LM.L_ANKLE),
    rightKnee: get(LM.R_HIP, LM.R_KNEE, LM.R_ANKLE),
  };
}

export default function WorkoutLiveScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const vbtRef = useRef(createVerticalVbtTracker());
  const gestureStateRef = useRef(createGestureStateMachine());
  const gestureBusyRef = useRef(false);
  const [angles, setAngles] = useState<WorkoutAngles>(EMPTY_ANGLES);
  const [profile, setProfile] = useState<WorkoutProfile | null>(null);
  const [lastGesture, setLastGesture] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const savedRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const phase = useWorkoutStore((state) => state.phase);
  const elapsedSec = useWorkoutStore((state) => state.elapsedSec);
  const metrics = useWorkoutStore((state) => state.metrics);
  const start = useWorkoutStore((state) => state.start);
  const pause = useWorkoutStore((state) => state.pause);
  const finish = useWorkoutStore((state) => state.finish);
  const tickTimer = useWorkoutStore((state) => state.tick);
  const setMetrics = useWorkoutStore((state) => state.setMetrics);
  const reset = useWorkoutStore((state) => state.reset);

  const { cameraStatus, cameraError } = useCameraDevice(videoRef, true, "user");
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);
  const targetMeshes = useMemo(
    () => exerciseById("squat")?.primaryMuscles ?? [],
    [],
  );

  const finishSession = useCallback(async () => {
    if (
      savedRef.current ||
      savingSession ||
      phase === "ready" ||
      phase === "finished"
    ) {
      return;
    }
    savedRef.current = true;
    finish();
    setSavingSession(true);
    setSaveMessage(null);
    const { error } = await persistWorkoutSession({
      durationSec: elapsedSec,
      metrics,
    });
    setSavingSession(false);
    setSaveMessage(error ?? "Тренировка сохранена");
  }, [elapsedSec, finish, metrics, phase, savingSession]);

  useEffect(() => {
    const vbt = vbtRef.current;
    const gestureState = gestureStateRef.current;
    void loadWorkoutProfile().then(setProfile);
    void warmHandLandmarker();
    return () => {
      vbt.reset();
      gestureState.reset();
      reset();
    };
  }, [reset]);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let lastUiUpdate = 0;
    let lastGestureCheck = 0;

    const frame = (now: number) => {
      if (!alive) return;
      const landmarks = tick();
      landmarksRef.current = landmarks;

      if (phase === "running") {
        const nextMetrics = vbtRef.current.update(landmarks, now);
        if (now - lastUiUpdate >= 120) {
          lastUiUpdate = now;
          setMetrics(nextMetrics);
          setAngles(calculateAngles(landmarks));
        }
        tickTimer(now);
      } else if (now - lastUiUpdate >= 180) {
        lastUiUpdate = now;
        setAngles(calculateAngles(landmarks));
      }

      const video = videoRef.current;
      if (video && video.readyState >= 2 && now - lastGestureCheck >= 120 && !gestureBusyRef.current) {
        lastGestureCheck = now;
        gestureBusyRef.current = true;
        void detectWorkoutGesture(video, now)
          .then((gesture) => {
            const stableGesture = gestureStateRef.current.update(gesture, performance.now());
            if (!stableGesture) return;
            setLastGesture(
              stableGesture === "thumbs_up"
                ? "ПАЛЕЦ ВВЕРХ · СТАРТ"
                : stableGesture === "open_palm_hold"
                  ? "ДЛИННОЕ УДЕРЖАНИЕ ЛАДОНИ · ЗАВЕРШЕНИЕ"
                  : "ОТКРЫТАЯ ЛАДОНЬ · ПАУЗА",
            );
            if (stableGesture === "thumbs_up") {
              const currentPhase = phaseRef.current;
              if (currentPhase !== "running") {
                start(performance.now());
              }
            }
            if (stableGesture === "open_palm" && phaseRef.current === "running") {
              pause();
            }
            if (stableGesture === "open_palm_hold") {
              void finishSession();
            }
          })
          .catch(() => undefined)
          .finally(() => {
            gestureBusyRef.current = false;
          });
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [finishSession, pause, phase, setMetrics, start, tick, tickTimer]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover" playsInline muted />
      <WorkoutPoseOverlay landmarksRef={landmarksRef} angles={angles} />
      <CameraStatusOverlay cameraStatus={cameraStatus} cameraError={cameraError} poseReady={poseReady} poseError={poseError} />
      <WorkoutHUD phase={phase} elapsedSec={elapsedSec} metrics={metrics} weightKg={profile?.weightKg ?? null} lastGesture={lastGesture} />
      <WorkoutAtlasPanel targetMeshes={targetMeshes} fatiguePercent={metrics.fatiguePercent} failed={metrics.failed} />
      <div className="absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 px-4 text-center">
        {phase === "ready" && (
          <button
            type="button"
            onClick={() => start(performance.now())}
            className="w-full max-w-sm rounded-2xl border border-cyan-200/50 bg-cyan-300 px-5 py-3 text-sm font-bold tracking-[0.08em] text-black shadow-[0_0_35px_rgba(34,211,238,0.28)]"
          >
            НАЧАТЬ ТРЕНИРОВКУ
          </button>
        )}
        {phase === "paused" && (
          <button
            type="button"
            onClick={() => start(performance.now())}
            className="w-full max-w-sm rounded-2xl border border-cyan-200/50 bg-cyan-300/90 px-5 py-3 text-sm font-bold tracking-[0.08em] text-black"
          >
            ПРОДОЛЖИТЬ
          </button>
        )}
        {phase === "running" && (
          <button
            type="button"
            onClick={() => pause()}
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/70 px-5 py-3 text-sm font-semibold tracking-wider text-zinc-100"
          >
            ПАУЗА
          </button>
        )}
        {(phase === "running" || phase === "paused") && (
          <button
            type="button"
            onClick={() => void finishSession()}
            disabled={savingSession}
            className="w-full max-w-sm rounded-2xl border border-rose-300/50 bg-rose-500/20 px-5 py-3 text-sm font-bold tracking-wider text-rose-100 disabled:opacity-50"
          >
            {savingSession ? "СОХРАНЕНИЕ..." : "ЗАВЕРШИТЬ И СОХРАНИТЬ"}
          </button>
        )}
        {phase === "finished" && (
          <Link
            href="/analytics"
            className="w-full max-w-sm rounded-2xl border border-cyan-200/50 bg-cyan-300 px-5 py-3 text-sm font-bold tracking-[0.08em] text-black"
          >
            К АНАЛИТИКЕ
          </Link>
        )}
        {saveMessage && (
          <p className={saveMessage === "Тренировка сохранена" ? "text-xs text-emerald-300" : "text-xs text-rose-300"}>
            {saveMessage}
          </p>
        )}
        <p className="text-[0.6rem] text-zinc-400">
          Жесты: 👍 старт/продолжить · ✋ пауза · удержание ✋ 1,8 с — завершить.
          Кнопки внизу — запасной способ.
        </p>
      </div>
    </main>
  );
}
