"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import { useCameraDevice } from "@/hooks/useCameraDevice";
import { usePoseTracker } from "@/hooks/usePoseTracker";
import { angle, LM } from "@/lib/pose/landmarks";
import { exerciseById } from "@/lib/training/exerciseCatalog";
import { createGestureStateMachine } from "@/lib/workout/gestureStateMachine";
import {
  detectWorkoutGesture,
  warmHandLandmarker,
} from "@/lib/workout/gestureDetector";
import { loadWorkoutProfile, type WorkoutProfile } from "@/lib/workout/loadWorkoutProfile";
import { loadWorkoutPlan } from "@/lib/workout/loadWorkoutPlan";
import {
  createWorkoutSessionFromPlan,
  ensureSessionExercise,
  finishWorkoutSession,
  markSessionExerciseComplete,
  persistSetLog,
} from "@/lib/workout/persistSetLog";
import { createVerticalVbtTracker } from "@/lib/workout/vbtFatigue";
import { useWorkoutStore } from "@/store/workoutStore";
import type { NormalizedLandmark } from "@/types";
import type { WorkoutAngles } from "@/lib/workout/types";
import WorkoutAtlasPanel from "@/components/workout/WorkoutAtlasPanel";
import WorkoutHUD from "@/components/workout/WorkoutHUD";
import WorkoutPoseOverlay from "@/components/workout/WorkoutPoseOverlay";
import WorkoutSetPanel from "@/components/workout/WorkoutSetPanel";

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

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WorkoutLiveScreen({ planDate }: { planDate?: string }) {
  const effectiveDate = planDate ?? todayKey();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const vbtRef = useRef(createVerticalVbtTracker());
  const gestureStateRef = useRef(createGestureStateMachine());
  const gestureBusyRef = useRef(false);
  const savedRef = useRef(false);

  const [angles, setAngles] = useState<WorkoutAngles>(EMPTY_ANGLES);
  const [profile, setProfile] = useState<WorkoutProfile | null>(null);
  const [lastGesture, setLastGesture] = useState<string | null>(null);
  const [savingSet, setSavingSet] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const phase = useWorkoutStore((s) => s.phase);
  const elapsedSec = useWorkoutStore((s) => s.elapsedSec);
  const metrics = useWorkoutStore((s) => s.metrics);
  const plan = useWorkoutStore((s) => s.plan);
  const start = useWorkoutStore((s) => s.start);
  const pause = useWorkoutStore((s) => s.pause);
  const finish = useWorkoutStore((s) => s.finish);
  const tickTimer = useWorkoutStore((s) => s.tick);
  const setMetrics = useWorkoutStore((s) => s.setMetrics);
  const resetMetrics = useWorkoutStore((s) => s.resetMetrics);
  const reset = useWorkoutStore((s) => s.reset);
  const initPlan = useWorkoutStore((s) => s.initPlan);
  const setSetPhase = useWorkoutStore((s) => s.setSetPhase);
  const setLoadWeightKg = useWorkoutStore((s) => s.setLoadWeightKg);
  const setSessionExerciseId = useWorkoutStore((s) => s.setSessionExerciseId);
  const advanceSet = useWorkoutStore((s) => s.advanceSet);
  const currentExercise = useWorkoutStore((s) => s.currentExercise);

  const phaseRef = useRef(phase);
  const setPhaseRef = useRef(plan.setPhase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    setPhaseRef.current = plan.setPhase;
  }, [plan.setPhase]);

  const { cameraStatus, cameraError } = useCameraDevice(videoRef, true, "user");
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  const exercise = currentExercise();
  const targetMeshes = useMemo(
    () => exercise?.targetMuscles ?? exerciseById(exercise?.exerciseId ?? "")?.primaryMuscles ?? [],
    [exercise],
  );

  const finishSession = useCallback(async () => {
    if (savedRef.current || !plan.sessionId) return;
    savedRef.current = true;
    finish();
    setSaveMessage(null);

    const lastEx = plan.exercises[plan.exercises.length - 1];
    const { error } = await finishWorkoutSession({
      sessionId: plan.sessionId,
      durationSec: elapsedSec,
      lastExerciseId: lastEx?.exerciseId ?? "mixed",
      metrics,
      totalReps: plan.totalReps + metrics.repetitions,
    });
    setSaveMessage(error ?? "Тренировка сохранена");
  }, [elapsedSec, finish, metrics, plan]);

  const completeCurrentSet = useCallback(async () => {
    if (!exercise || !plan.sessionId || savingSet) return;
    setSavingSet(true);
    setSaveMessage(null);

    let sessionExerciseId = plan.sessionExerciseId;
    if (!sessionExerciseId) {
      const ensured = await ensureSessionExercise({
        sessionId: plan.sessionId,
        exercise,
        sortOrder: plan.exerciseIndex,
      });
      if (ensured.error || !ensured.sessionExerciseId) {
        setSaveMessage(ensured.error ?? "Ошибка упражнения");
        setSavingSet(false);
        return;
      }
      sessionExerciseId = ensured.sessionExerciseId;
      setSessionExerciseId(sessionExerciseId);
    }

    const { error: logError } = await persistSetLog({
      sessionId: plan.sessionId,
      sessionExerciseId,
      setIndex: plan.setIndex,
      plannedReps: exercise.reps,
      actualReps: metrics.repetitions,
      weightKg: plan.loadWeightKg,
      avgVelocityMs: metrics.verticalVelocityMs,
    });

    if (logError) {
      setSaveMessage(logError);
      setSavingSet(false);
      return;
    }

    pause();
    vbtRef.current.reset();
    resetMetrics();

    const isLastSetOfExercise = plan.setIndex + 1 >= exercise.sets;
    if (isLastSetOfExercise && sessionExerciseId) {
      await markSessionExerciseComplete(sessionExerciseId);
    }

    const { done } = advanceSet();
    useWorkoutStore.setState((state) => ({
      plan: {
        ...state.plan,
        totalReps: state.plan.totalReps + metrics.repetitions,
      },
    }));
    setSavingSet(false);

    if (done) {
      await finishSession();
    }
  }, [
    advanceSet,
    exercise,
    finishSession,
    metrics,
    pause,
    plan,
    resetMetrics,
    savingSet,
    setSessionExerciseId,
  ]);

  const handleStartSet = useCallback(() => {
    if (plan.loadWeightKg === null) {
      setLoadWeightKg(0);
    }
    setSetPhase("performing");
    resetMetrics();
    vbtRef.current.reset();
    start(performance.now());
  }, [plan.loadWeightKg, resetMetrics, setLoadWeightKg, setSetPhase, start]);

  const handleSkipRest = useCallback(() => {
    setSetPhase("awaiting_weight");
  }, [setSetPhase]);

  useEffect(() => {
    let cancelled = false;
    setPlanLoading(true);
    setLoadError(null);

    void (async () => {
      const loadedPlan = await loadWorkoutPlan(effectiveDate);
      if (cancelled) return;
      if (loadedPlan.error || !loadedPlan.data) {
        setLoadError(loadedPlan.error ?? "План не найден");
        setPlanLoading(false);
        return;
      }

      const session = await createWorkoutSessionFromPlan({
        planId: loadedPlan.data.planId,
        programId: loadedPlan.data.programId,
        planDate: effectiveDate,
        title: loadedPlan.data.plan.title,
      });

      if (cancelled) return;
      if (session.error || !session.sessionId) {
        setLoadError(session.error ?? "Не удалось начать сессию");
        setPlanLoading(false);
        return;
      }

      initPlan({
        planId: loadedPlan.data.planId,
        programId: loadedPlan.data.programId,
        planDate: effectiveDate,
        planTitle: loadedPlan.data.plan.title,
        exercises: loadedPlan.data.plan.exercises,
        sessionId: session.sessionId,
      });
      setPlanLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [effectiveDate, initPlan]);

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
      if (
        video &&
        video.readyState >= 2 &&
        now - lastGestureCheck >= 120 &&
        !gestureBusyRef.current
      ) {
        lastGestureCheck = now;
        gestureBusyRef.current = true;
        void detectWorkoutGesture(video, now)
          .then((gesture) => {
            const stableGesture = gestureStateRef.current.update(
              gesture,
              performance.now(),
            );
            if (!stableGesture) return;
            setLastGesture(
              stableGesture === "thumbs_up"
                ? "ПАЛЕЦ ВВЕРХ · СТАРТ"
                : stableGesture === "open_palm_hold"
                  ? "ДЛИННОЕ УДЕРЖАНИЕ · ЗАВЕРШИТЬ ПОДХОД"
                  : "ОТКРЫТАЯ ЛАДОНЬ · ПАУЗА",
            );
            if (
              stableGesture === "thumbs_up" &&
              setPhaseRef.current === "performing" &&
              phaseRef.current !== "running"
            ) {
              start(performance.now());
            }
            if (stableGesture === "open_palm" && phaseRef.current === "running") {
              pause();
            }
            if (stableGesture === "open_palm_hold" && setPhaseRef.current === "performing") {
              void completeCurrentSet();
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
  }, [completeCurrentSet, pause, phase, setMetrics, start, tick, tickTimer]);

  if (planLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black text-cyan-100">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black p-6 text-center">
        <p className="text-sm text-rose-300">{loadError}</p>
        <Link
          href="/plan"
          className="mt-4 rounded-2xl border border-cyan-200/50 bg-cyan-300 px-6 py-3 text-sm font-bold text-black"
        >
          К ПЛАНУ
        </Link>
      </main>
    );
  }

  const setLabel = exercise
    ? `Подход ${plan.setIndex + 1} / ${exercise.sets}`
    : undefined;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
        playsInline
        muted
      />
      <WorkoutPoseOverlay landmarksRef={landmarksRef} angles={angles} />
      <CameraStatusOverlay
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        poseReady={poseReady}
        poseError={poseError}
      />
      <WorkoutHUD
        phase={phase}
        elapsedSec={elapsedSec}
        metrics={metrics}
        bodyWeightKg={profile?.weightKg ?? null}
        loadWeightKg={plan.loadWeightKg}
        exerciseName={exercise?.name}
        setLabel={setLabel}
        lastGesture={lastGesture}
      />
      <WorkoutAtlasPanel
        targetMeshes={targetMeshes}
        fatiguePercent={metrics.fatiguePercent}
        failed={metrics.failed}
      />

      {exercise && plan.setPhase !== "done" && (
        <WorkoutSetPanel
          exercise={exercise}
          setIndex={plan.setIndex}
          totalSets={exercise.sets}
          loadWeightKg={plan.loadWeightKg}
          setPhase={
            plan.setPhase === "loading"
              ? "loading"
              : plan.setPhase === "awaiting_weight"
                ? "awaiting_weight"
                : plan.setPhase === "rest"
                  ? "rest"
                  : "performing"
          }
          onWeightChange={setLoadWeightKg}
          onStartSet={handleStartSet}
          onCompleteSet={() => void completeCurrentSet()}
          onSkipRest={handleSkipRest}
          saving={savingSet}
        />
      )}

      <div className="absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 px-4 text-center">
        {phase === "finished" && (
          <Link
            href="/analytics"
            className="w-full max-w-sm rounded-2xl border border-cyan-200/50 bg-cyan-300 px-5 py-3 text-sm font-bold tracking-[0.08em] text-black"
          >
            К АНАЛИТИКЕ
          </Link>
        )}
        {saveMessage && (
          <p
            className={
              saveMessage === "Тренировка сохранена"
                ? "text-xs text-emerald-300"
                : "text-xs text-rose-300"
            }
          >
            {saveMessage}
          </p>
        )}
        <p className="text-[0.6rem] text-zinc-400">
          План: {plan.planTitle || effectiveDate} · жесты: 👍 старт подхода · ✋ пауза ·
          удержание ✋ — завершить подход
        </p>
      </div>
    </main>
  );
}
