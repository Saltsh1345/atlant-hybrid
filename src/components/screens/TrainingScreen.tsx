"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import StrikeEffects, {
  type StrikeBurst,
} from "@/components/camera/StrikeEffects";
import AutoFrameViewport from "@/components/camera/AutoFrameViewport";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import CountdownOverlay from "@/components/training/CountdownOverlay";
import RestTimerOverlay from "@/components/training/RestTimerOverlay";
import WorkoutFocusHUD from "@/components/hud/WorkoutFocusHUD";
import LiveScanGrid from "@/components/visual/LiveScanGrid";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
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
import { coachForExercise, exerciseLabel } from "@/lib/pose/exercises";
import { drillForSport } from "@/lib/training/drillProtocol";
import { useSportDrill } from "@/hooks/useSportDrill";
import SportDrillOverlay from "@/components/training/SportDrillOverlay";
import { speakGuidance, stopSpeaking } from "@/lib/ai/speech";
import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";

export default function TrainingScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [coachText, setCoachText] = useState("");
  const [strikeFlash, setStrikeFlash] = useState(false);
  const [lastStrikeSpeed, setLastStrikeSpeed] = useState<number | null>(null);
  const [strikeBurst, setStrikeBurst] = useState<StrikeBurst | null>(null);
  const strikeIdRef = useRef(0);
  const [reps, setReps] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [countdownDone, setCountdownDone] = useState(false);
  const [resting, setResting] = useState(false);
  const [formScore, setFormScore] = useState(0);
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

  const drillCommands = useMemo(
    () => drillForSport(selectedSport) ?? [],
    [selectedSport]
  );
  const isDrillSport = drillCommands.length > 0;
  const drill = useSportDrill(drillCommands);

  const { cameraStatus, cameraError } = useCamera(videoRef, true);
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  useEffect(() => {
    resetVbtState();
    resetRepCounter();
    resetFormScore();
    fatigueSpokenRef.current = false;
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (isDrillSport && countdownDone && !drill.started) {
      drill.start();
    }
  }, [isDrillSport, countdownDone, drill.started, drill.start]);

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

  useEffect(() => {
    if (!countdownDone) return;
    let raf: number;
    const loop = () => {
      const lm = tick();
      if (lm && profile) {
        setLandmarks(lm);
        const k = computeKinematics(lm, selectedSport, profile.height);
        updateKinematics(k);

        const tracking = !isDrillSport || drill.isTracking;

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
            profile.injuries ?? ""
          );
          if (hint) coach(hint);
        }

        if (selectedSport === "boxing" && drill.isTracking) {
          const speed = detectDrillStrike(
            k.punchSpeedMs,
            k.wristVelocityMs,
            k.elbowAngle
          );
          if (speed != null) {
            flashStrike(speed, lm);
            const hitForm = computeFormScore(selectedSport, selectedExercise, k);
            drill.reportHit({
              speedMs: speed,
              accuracy: hitForm,
              elbowAngle: k.elbowAngle,
            });
          }
        }

        if (selectedSport === "tennis" && drill.isTracking) {
          const speed = detectDrillSwing(
            k.wristVelocityMs,
            k.spineFlexion,
            k.elbowAngle
          );
          if (speed != null) {
            flashStrike(speed, lm);
            const hitForm = computeFormScore(selectedSport, selectedExercise, k);
            drill.reportHit({
              speedMs: speed,
              accuracy: hitForm,
              elbowAngle: k.elbowAngle,
            });
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
    countdownDone,
    tick,
    profile,
    selectedSport,
    selectedExercise,
    updateKinematics,
    pushSample,
    coach,
    flashStrike,
    isDrillSport,
    drill.isTracking,
    drill.reportHit,
  ]);

  const sportLabel =
    selectedSport === "strength" && selectedExercise
      ? exerciseLabel(selectedExercise)
      : selectedSport;

  const ready = cameraStatus === "ready" && poseReady && !poseError;
  const trackingActive = isDrillSport ? drill.isTracking : countdownDone;
  const criticalMeshes = useMemo(
    () =>
      criticalMusclesFromLive(
        selectedSport,
        selectedExercise,
        formScore > 0 ? formScore : 100
      ),
    [selectedSport, selectedExercise, formScore]
  );
  const autoFrameVoice =
    ready &&
    (!isDrillSport ||
      drill.phase === "active" ||
      drill.phase === "rest" ||
      drill.phase === "complete");

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Левая часть: камера + HUD */}
      <div className="relative flex min-h-[55vh] flex-1 flex-col lg:min-h-dvh lg:max-w-[58%]">
        <div className="relative flex-1 overflow-hidden rounded-b-2xl border-b border-[var(--primary)]/20 bg-background-secondary shadow-inner lg:rounded-none lg:border-b-0 lg:border-r">
          <AutoFrameViewport
            videoRef={videoRef}
            landmarks={landmarks}
            active={ready}
            sport={selectedSport}
            voiceNudges={autoFrameVoice}
          >
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
          </AutoFrameViewport>

          <CameraStatusOverlay
            cameraStatus={cameraStatus}
            cameraError={cameraError}
            poseReady={poseReady}
            poseError={poseError}
          />

          {ready && !countdownDone && (
            <CountdownOverlay onComplete={() => setCountdownDone(true)} />
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
              onAnalyze={() => setPhase("analysis")}
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
