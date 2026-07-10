"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import StrikeEffects, {
  type StrikeBurst,
} from "@/components/camera/StrikeEffects";
import CoachCameraViewport from "@/components/camera/CoachCameraViewport";
import CameraFacingToggle from "@/components/camera/CameraFacingToggle";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import CountdownOverlay from "@/components/training/CountdownOverlay";
import SilhouetteSetupGate from "@/components/training/SilhouetteSetupGate";
import RestTimerOverlay from "@/components/training/RestTimerOverlay";
import WorkoutFocusHUD from "@/components/hud/WorkoutFocusHUD";
import LiveScanGrid from "@/components/visual/LiveScanGrid";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import { usePoseTracker } from "@/hooks/usePoseTracker";
import { useCameraDevice } from "@/hooks/useCameraDevice";
import type { CameraFacing } from "@/lib/camera/deviceProfile";
import type { CoachContext } from "@/lib/camera/positionCoach";
import { useAppStore } from "@/store/useAppStore";
import { criticalMusclesFromLive } from "@/lib/three/muscleGroups";
import { computeKinematics, resetVbtState } from "@/lib/pose/vbt";
import {
  resetRepCounter,
  updateSquatReps,
  updateBenchReps,
  detectDrillStrike,
  detectDrillSwing,
} from "@/lib/pose/repCounter";
import {
  computeFormScore,
  pushFormSample,
  resetFormScore,
} from "@/lib/pose/formScore";
import {
  computeEliteScore,
  kinematicsToFeatures,
  pushEliteSample,
  resetEliteSession,
} from "@/lib/elite";
import { coachForExercise, exerciseLabel } from "@/lib/pose/exercises";
import { drillForSport } from "@/lib/training/drillProtocol";
import { validateDrillHit } from "@/lib/training/drillHitValidation";
import { resetSessionVideoClips } from "@/lib/training/sessionVideoClips";
import { useSportDrill } from "@/hooks/useSportDrill";
import { useSessionVideoCapture } from "@/hooks/useSessionVideoCapture";
import SportDrillOverlay from "@/components/training/SportDrillOverlay";
import { speakGuidance, stopSpeaking } from "@/lib/ai/speech";
import { estimateDistanceMeters } from "@/lib/camera/distanceEstimator";
import { estimateHeightFromPose } from "@/lib/camera/heightEstimator";
import { resetDistanceSmoother } from "@/lib/camera/distanceSmoother";
import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";

export default function TrainingScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [coachText, setCoachText] = useState("");
  const [strikeFlash, setStrikeFlash] = useState(false);
  const [lastStrikeSpeed, setLastStrikeSpeed] = useState<number | null>(null);
  const [strikeBurst, setStrikeBurst] = useState<StrikeBurst | null>(null);
  const strikeIdRef = useRef(0);
  const [reps, setReps] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [countdownDone, setCountdownDone] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [resting, setResting] = useState(false);
  const [formScore, setFormScore] = useState(0);
  const [eliteScore, setEliteScore] = useState(0);
  const [lastHitHint, setLastHitHint] = useState<{
    speedMs: number;
    accuracy: number;
    elbowAngle: number;
    fixed: boolean;
  } | null>(null);
  const lastHitHintRef = useRef(lastHitHint);
  lastHitHintRef.current = lastHitHint;
  const repsRef = useRef(0);
  const lastCoachRef = useRef(0);
  const fatigueSpokenRef = useRef(false);

  const profile = useAppStore((s) => s.profile);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const selectedSport = useAppStore((s) => s.selectedSport)!;
  const selectedExercise = useAppStore((s) => s.selectedExercise);
  const sessionStartTime = useAppStore((s) => s.sessionStartTime);
  const kinematics = useAppStore((s) => s.kinematics);
  const updateKinematics = useAppStore((s) => s.updateKinematics);
  const pushSample = useAppStore((s) => s.pushSample);
  const setPhase = useAppStore((s) => s.setPhase);
  const patchProfileHeight = useAppStore((s) => s.patchProfileHeight);
  const cameraCalibration = useAppStore((s) => s.cameraCalibration);
  const ensureCameraCalibration = useAppStore((s) => s.ensureCameraCalibration);

  const drillCommands = useMemo(
    () => drillForSport(selectedSport) ?? [],
    [selectedSport]
  );
  const isDrillSport = drillCommands.length > 0;
  const drill = useSportDrill(drillCommands);

  const { cameraStatus, cameraError, canSwitch } = useCameraDevice(
    videoRef,
    true,
    cameraFacing
  );
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);
  const tickRef = useRef(tick);
  const profileRef = useRef(profile);
  const cameraCalibRef = useRef(cameraCalibration);
  const drillRef = useRef(drill);
  tickRef.current = tick;
  profileRef.current = profile;
  cameraCalibRef.current = cameraCalibration;
  drillRef.current = drill;

  useEffect(() => {
    resetVbtState();
    resetRepCounter();
    resetFormScore();
    resetEliteSession();
    resetSessionVideoClips();
    resetDistanceSmoother();
    ensureCameraCalibration();
    fatigueSpokenRef.current = false;
    return () => stopSpeaking();
  }, [ensureCameraCalibration]);

  useSessionVideoCapture(videoRef, {
    sport: selectedSport,
    exercise: selectedExercise,
    countdownDone,
    isDrillSport,
    drillPhase: drill.phase,
    drillCommand: drill.command,
    lastHitHintRef,
  });

  const drillAutoStartedRef = useRef(false);
  const analysisAutoRef = useRef(false);
  const [autoAnalyzeSec, setAutoAnalyzeSec] = useState<number | null>(null);
  const [detectedHeightCm, setDetectedHeightCm] = useState<number | null>(null);

  useEffect(() => {
    if (
      isDrillSport &&
      countdownDone &&
      !drill.started &&
      !drillAutoStartedRef.current
    ) {
      drillAutoStartedRef.current = true;
      drill.start();
    }
  }, [isDrillSport, countdownDone, drill.started, drill.start]);

  useEffect(() => {
    if (!isDrillSport || drill.phase !== "complete" || analysisAutoRef.current) {
      if (drill.phase !== "complete") {
        setAutoAnalyzeSec(null);
      }
      return;
    }

    setAutoAnalyzeSec(3);
    speakGuidance(
      "drill:auto-analysis",
      "Открываю анализ через три секунды",
      { cooldownMs: 5000 }
    );

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setAutoAnalyzeSec(2), 1000));
    timers.push(setTimeout(() => setAutoAnalyzeSec(1), 2000));
    timers.push(
      setTimeout(() => {
        analysisAutoRef.current = true;
        setAutoAnalyzeSec(null);
        setPhase("analysis");
      }, 3000)
    );

    return () => timers.forEach(clearTimeout);
  }, [isDrillSport, drill.phase, setPhase]);

  useEffect(() => {
    if (!sessionStartTime || !countdownDone) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStartTime, countdownDone]);

  const coach = useCallback((text: string) => {
    const now = Date.now();
    if (now - lastCoachRef.current < 5000) return;
    lastCoachRef.current = now;
    setCoachText(text);
    speakGuidance("training:coach", text, { cooldownMs: 6000 });
  }, []);

  const flashStrike = useCallback(
    (speed: number, lm: NormalizedLandmark[]) => {
      setLastStrikeSpeed(speed);
      setStrikeFlash(true);
      const lW = lm[LM.L_WRIST];
      const rW = lm[LM.R_WRIST];
      const w = (lW.visibility ?? 0) > (rW.visibility ?? 0) ? lW : rW;
      const burstId = ++strikeIdRef.current;
      if ((w.visibility ?? 0) > 0.35) {
        setStrikeBurst({
          id: burstId,
          x: 1 - w.x,
          y: w.y,
          speed,
          sport: selectedSport as "boxing" | "tennis",
          t: Date.now(),
        });
      }
      setTimeout(() => {
        setStrikeFlash(false);
        setStrikeBurst((prev) => (prev?.id === burstId ? null : prev));
      }, 650);
    },
    [selectedSport]
  );

  const ready = cameraStatus === "ready" && poseReady && !poseError;
  const trackingActive = isDrillSport ? drill.isTracking : countdownDone;
  const showSetup = ready && !setupDone && !countdownDone;
  const showSetupRef = useRef(false);
  const heightScanFrameRef = useRef(0);
  const detectedHeightRef = useRef<number | null>(null);
  showSetupRef.current = showSetup;

  const finishSetup = useCallback(() => setSetupDone(true), []);
  const finishCountdown = useCallback(() => setCountdownDone(true), []);

  useEffect(() => {
    if (!ready) return;
    let raf: number;
    let frame = 0;
    const loop = () => {
      const lm = tickRef.current();
      if (lm) {
        landmarksRef.current = lm;
        frame += 1;
        if (frame % 4 === 0) {
          setLandmarks(lm);
        }

        if (showSetupRef.current) {
          heightScanFrameRef.current += 1;
          if (heightScanFrameRef.current % 24 === 0) {
            const cal =
              cameraCalibRef.current ??
              useAppStore.getState().cameraCalibration;
            const baseHeight = profileRef.current?.height ?? 182;
            const dist = estimateDistanceMeters(
              lm,
              baseHeight,
              "laptop",
              cal,
              true
            )?.meters;
            const est = estimateHeightFromPose(lm, dist, cal);
            if (est && est.confidence === "high") {
              patchProfileHeight(est.heightCm);
              if (detectedHeightRef.current !== est.heightCm) {
                detectedHeightRef.current = est.heightCm;
                setDetectedHeightCm(est.heightCm);
              }
            }
          }
        }
      }

      const profileNow = profileRef.current;
      const drillNow = drillRef.current;

      if (lm && profileNow && countdownDone) {
        const k = computeKinematics(lm, selectedSport, profileNow.height);
        updateKinematics(k);

        const tracking = !isDrillSport || drillNow.isTracking;

        if (tracking) {
          pushSample({
            t: Date.now(),
            velocityMs: k.velocityMs,
            kneeAngle: k.kneeAngle,
            wristVelocityMs: k.wristVelocityMs,
            fatigue: k.fatiguePercent,
          });
        }

        const fs = computeFormScore(selectedSport, selectedExercise, k);
        if (tracking) {
          pushFormSample(fs);
          setFormScore(fs);
        }

        if (selectedSport === "strength" && selectedExercise && tracking) {
          const r =
            selectedExercise === "bench"
              ? updateBenchReps(k.elbowAngle)
              : updateSquatReps(k.kneeAngle);
          if (r !== repsRef.current) {
            repsRef.current = r;
            setReps(r);
          }
          const hint = coachForExercise(
            selectedExercise,
            k,
            profileNow.injuries ?? ""
          );
          if (hint) coach(hint);
        }

        if (selectedSport === "boxing" && drillNow.isTracking) {
          const speed = detectDrillStrike(
            k.punchSpeedMs,
            k.wristVelocityMs,
            k.elbowAngle
          );
          if (speed != null) {
            flashStrike(speed, lm);
            const features = kinematicsToFeatures(k, lm);
            const elite = computeEliteScore(
              features,
              drillNow.command?.type ?? "jab",
              "boxing"
            );
            const validation = validateDrillHit(
              drillNow.command?.type ?? "jab",
              "boxing",
              k,
              features,
              elite,
              speed
            );
            const hint = {
              speedMs: speed,
              accuracy: validation.accuracy,
              elbowAngle: k.elbowAngle,
              fixed: validation.valid && speed >= 2.2 && validation.accuracy >= 52,
              valid: validation.valid,
              rejectionReason: validation.valid ? undefined : validation.reason,
              eliteOverall: validation.valid ? elite.overall : undefined,
              eliteTechnique: elite.techniqueVsElite,
              eliteActionMatch: elite.actionMatch,
              eliteDeviations: elite.deviations,
            };
            if (validation.valid) {
              pushEliteSample(elite);
              setEliteScore(elite.overall);
            }
            lastHitHintRef.current = hint;
            setLastHitHint(hint);
            drillNow.reportHit(hint);
          }
        }

        if (selectedSport === "tennis" && drillNow.isTracking) {
          const speed = detectDrillSwing(
            k.wristVelocityMs,
            k.spineFlexion,
            k.elbowAngle
          );
          if (speed != null) {
            flashStrike(speed, lm);
            const features = kinematicsToFeatures(k, lm);
            const elite = computeEliteScore(
              features,
              drillNow.command?.type ?? "forehand",
              "tennis"
            );
            const validation = validateDrillHit(
              drillNow.command?.type ?? "forehand",
              "tennis",
              k,
              features,
              elite,
              speed
            );
            const hint = {
              speedMs: speed,
              accuracy: validation.accuracy,
              elbowAngle: k.elbowAngle,
              fixed: validation.valid && speed >= 2.0 && validation.accuracy >= 50,
              valid: validation.valid,
              rejectionReason: validation.valid ? undefined : validation.reason,
              eliteOverall: validation.valid ? elite.overall : undefined,
              eliteTechnique: elite.techniqueVsElite,
              eliteActionMatch: elite.actionMatch,
              eliteDeviations: elite.deviations,
            };
            if (validation.valid) {
              pushEliteSample(elite);
              setEliteScore(elite.overall);
            }
            lastHitHintRef.current = hint;
            setLastHitHint(hint);
            drillNow.reportHit(hint);
          }
        }

        if (
          !isDrillSport &&
          k.fatiguePercent > 55 &&
          !fatigueSpokenRef.current
        ) {
          fatigueSpokenRef.current = true;
          coach("Скорость упала, вы устали. Сосредоточьтесь на технике.");
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    countdownDone,
    selectedSport,
    selectedExercise,
    isDrillSport,
    updateKinematics,
    pushSample,
    coach,
    flashStrike,
    patchProfileHeight,
  ]);

  const sportLabel =
    selectedSport === "strength" && selectedExercise
      ? exerciseLabel(selectedExercise)
      : selectedSport;

  const coachContext: CoachContext | null = useMemo(() => {
    if (!ready) return null;
    if (showSetup) return null;
    if (countdownDone) {
      return {
        mode: "training",
        sport: selectedSport,
        exercise: selectedExercise,
      };
    }
    return null;
  }, [
    ready,
    showSetup,
    countdownDone,
    selectedSport,
    selectedExercise,
  ]);

  const criticalMeshes = useMemo(
    () =>
      criticalMusclesFromLive(
        selectedSport,
        selectedExercise,
        formScore > 0 ? formScore : 100
      ),
    [selectedSport, selectedExercise, formScore]
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Левая часть: камера + HUD */}
      <div className="relative flex min-h-[55vh] flex-1 flex-col lg:min-h-dvh lg:max-w-[58%]">
        <div className="relative flex-1 overflow-hidden rounded-b-2xl border-b border-[var(--primary)]/20 bg-background-secondary shadow-inner lg:rounded-none lg:border-b-0 lg:border-r">
          <CoachCameraViewport
            videoRef={videoRef}
            landmarks={landmarks}
            mirror={cameraFacing === "user"}
            coachContext={coachContext}
            coachActive={ready && countdownDone}
            voiceCoach={
              countdownDone && isDrillSport && drill.phase === "active"
            }
            heightCm={profile?.height}
            cameraCalibration={cameraCalibration ?? undefined}
          >
            <CameraFacingToggle
              facing={cameraFacing}
              canSwitch={canSwitch}
              onToggle={() =>
                setCameraFacing((f) => (f === "user" ? "environment" : "user"))
              }
            />
            <LiveScanGrid active={isDrillSport && drill.isTracking} />
            {(selectedSport === "boxing" || selectedSport === "tennis") &&
              trackingActive && (
                <StrikeEffects
                  landmarks={landmarks}
                  active
                  sport={selectedSport}
                  burst={strikeBurst}
                />
              )}
            {strikeFlash &&
              (selectedSport === "boxing" || selectedSport === "tennis") && (
                <div
                  className={`pointer-events-none absolute inset-0 z-[14] ${
                    selectedSport === "boxing"
                      ? "strike-vignette-boxing"
                      : "strike-vignette-tennis"
                  }`}
                />
              )}
          </CoachCameraViewport>

          <CameraStatusOverlay
            cameraStatus={cameraStatus}
            cameraError={cameraError}
            poseReady={poseReady}
            poseError={poseError}
          />

          {showSetup && (
            <SilhouetteSetupGate
              sport={selectedSport}
              exercise={selectedExercise}
              landmarksRef={landmarksRef}
              active
              heightCm={profile?.height ?? 182}
              onReady={finishSetup}
              onSkip={finishSetup}
            />
          )}

          {ready && setupDone && !countdownDone && (
            <CountdownOverlay onComplete={finishCountdown} />
          )}
          {resting && (
            <RestTimerOverlay
              seconds={60}
              onDone={() => setResting(false)}
              onSkip={() => setResting(false)}
            />
          )}

          {trackingActive && (
            <WorkoutFocusHUD
              sport={selectedSport}
              kinematics={kinematics}
              exercise={selectedExercise}
              reps={reps}
              formScore={formScore}
              eliteScore={eliteScore}
              elapsedSec={elapsedSec}
              strikeLabel={drill.command?.text}
              lastStrikeSpeed={lastStrikeSpeed}
              strikeFlash={strikeFlash}
            />
          )}

          {isDrillSport && countdownDone && (
            <SportDrillOverlay
              phase={drill.phase}
              command={drill.command}
              commandIndex={drill.commandIndex}
              totalCommands={drill.totalCommands}
              countdown={drill.countdown}
              activeSecLeft={drill.activeSecLeft}
              fixationText={drill.fixationText}
              fixedCount={drill.fixedCount}
              autoAnalyzeSec={autoAnalyzeSec}
            />
          )}

        </div>

        <div className="flex gap-2 p-4 lg:hidden">
          <Button
            size="lg"
            variant="ghost"
            className="!w-auto flex-1 !border !border-border !bg-surface/90 !text-foreground-secondary"
            onClick={() => setResting(true)}
            disabled={!countdownDone || resting || isDrillSport}
          >
            Отдых 60с
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-[2]"
            onClick={() => setPhase("analysis")}
            disabled={!countdownDone}
          >
            {isDrillSport && drill.phase === "complete"
              ? "Анализ и план"
              : "Стоп — Анализ"}
          </Button>
        </div>
      </div>

      {/* Правая часть: 3D-заглушка (heatmap emission) */}
      <aside className="hidden w-full flex-col gap-4 p-4 opacity-60 transition-opacity lg:flex lg:w-[42%] lg:max-w-[480px] lg:p-6 lg:opacity-40">
        <div className="hidden items-center justify-between lg:flex">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Цифровой двойник
          </h2>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[9px] ${
              criticalMeshes.length > 0
                ? "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-danger"
                : "border-[var(--primary)]/30 bg-[var(--primary-muted)] text-primary"
            }`}
          >
            {criticalMeshes.length > 0 ? "CRITICAL" : "MESH"}
          </span>
        </div>

        <div className="min-h-[220px] flex-1">
          <BiomechTwinPanel
            latchedBody={latchedBody}
            locked={bodyDataLocked}
            criticalMeshes={criticalMeshes}
            tall
            showHud
            className="h-full min-h-[220px] lg:min-h-[calc(100dvh-8rem)]"
          />
        </div>

        <div className="hidden gap-2 lg:flex">
          <Button
            size="lg"
            variant="ghost"
            className="!w-auto flex-1 !border !border-border !bg-surface/90 !text-foreground-secondary"
            onClick={() => setResting(true)}
            disabled={!countdownDone || resting || isDrillSport}
          >
            Отдых 60с
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-[2]"
            onClick={() => setPhase("analysis")}
            disabled={!countdownDone}
          >
            {isDrillSport && drill.phase === "complete"
              ? "Анализ и план"
              : "Стоп — Анализ"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
