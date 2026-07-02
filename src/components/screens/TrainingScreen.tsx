"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Button from "@/components/ui/Button";
import PunchTrail from "@/components/camera/PunchTrail";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import CountdownOverlay from "@/components/training/CountdownOverlay";
import RestTimerOverlay from "@/components/training/RestTimerOverlay";
import TrainingHUD from "@/components/hud/TrainingHUD";
import LiveScanGrid from "@/components/visual/LiveScanGrid";
import AvatarViewer from "@/components/three/AvatarViewer";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import { useAppStore } from "@/store/useAppStore";
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
  coachForExercise,
  metricForExercise,
  tensionForExercise,
  exerciseLabel,
} from "@/lib/pose/exercises";
import { drillForSport } from "@/lib/training/drillProtocol";
import { useSportDrill } from "@/hooks/useSportDrill";
import SportDrillOverlay from "@/components/training/SportDrillOverlay";
import { speak, stopSpeaking } from "@/lib/ai/speech";
import type { NormalizedLandmark } from "@/types";

export default function TrainingScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [coachText, setCoachText] = useState("");
  const [punchFlash, setPunchFlash] = useState(false);
  const { asset } = useAvatarAsset();
  const [reps, setReps] = useState(0);
  const [punches, setPunches] = useState(0);
  const [swings, setSwings] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [countdownDone, setCountdownDone] = useState(false);
  const [resting, setResting] = useState(false);
  const [formScore, setFormScore] = useState(0);
  const repsRef = useRef(0);
  const punchesRef = useRef(0);
  const swingsRef = useRef(0);
  const lastCoachRef = useRef(0);
  const fatigueSpokenRef = useRef(false);

  const profile = useAppStore((s) => s.profile);
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

  const tension = useMemo(() => {
    if (selectedSport !== "strength" || !selectedExercise) return 0;
    return tensionForExercise(selectedExercise, kinematics);
  }, [selectedSport, selectedExercise, kinematics]);

  const metric = useMemo(() => {
    if (selectedSport === "strength" && selectedExercise) {
      return metricForExercise(selectedExercise, kinematics);
    }
    if (selectedSport === "boxing") {
      return {
        label: "Запястье",
        value: `${kinematics.wristVelocityMs}`,
        unit: "м/с",
      };
    }
    return {
      label: "Прогиб",
      value: `${kinematics.spineFlexion}`,
      unit: "°",
    };
  }, [selectedSport, selectedExercise, kinematics]);

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
    speak(text);
  }, []);

  useEffect(() => {
    if (!countdownDone) return;
    let raf: number;
    const loop = () => {
      const lm = tick();
      if (lm && profile) {
        setLandmarks(lm);
        const k = computeKinematics(lm, selectedSport, profile.height);
        updateKinematics(k);

        const tracking =
          !isDrillSport || drill.isTracking;

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
            punchesRef.current += 1;
            setPunches(punchesRef.current);
            setPunchFlash(true);
            setTimeout(() => setPunchFlash(false), 400);
            const fs = computeFormScore(selectedSport, selectedExercise, k);
            drill.reportHit({
              speedMs: speed,
              accuracy: fs,
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
            swingsRef.current += 1;
            setSwings(swingsRef.current);
            const fs = computeFormScore(selectedSport, selectedExercise, k);
            drill.reportHit({
              speedMs: speed,
              accuracy: fs,
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
    isDrillSport,
    drill.isTracking,
    drill.reportHit,
  ]);

  const sportLabel =
    selectedSport === "strength" && selectedExercise
      ? exerciseLabel(selectedExercise)
      : selectedSport;

  const ready = cameraStatus === "ready" && poseReady && !poseError;
  const darkActive = isDrillSport ? drill.isTracking : countdownDone;

  return (
    <div className="relative min-h-dvh bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-contain"
        playsInline
        muted
        autoPlay
      />

      {darkActive && selectedSport === "strength" && (
        <div className="absolute inset-0 z-[2] bg-black/40" />
      )}
      <LiveScanGrid active={isDrillSport && drill.isTracking} />

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

      {!isDrillSport && (
        <PunchTrail
          landmarks={landmarks}
          active={selectedSport === "boxing" || selectedSport === "tennis"}
        />
      )}

      <TrainingHUD
        kinematics={kinematics}
        sport={selectedSport}
        coachText={isDrillSport ? "" : coachText}
        punchFlash={punchFlash && drill.isTracking}
        reps={reps}
        punches={punches}
        swings={swings}
        formScore={formScore}
        exercise={selectedExercise}
        metricLabel={metric.label}
        metricValue={metric.value}
        metricUnit={metric.unit}
        elapsedSec={elapsedSec}
        minimal={isDrillSport}
      />

      {selectedSport === "strength" && (
        <div className="absolute top-36 right-3 z-20 w-28">
          <AvatarViewer
            asset={asset}
            showWireframe
            tension={tension}
            compact
            landmarks={landmarks}
          />
        </div>
      )}

      <div className="absolute top-4 right-4 left-4 z-30 flex justify-between">
        <span className="atlant-hud-pill !text-[9px]">
          {isDrillSport ? "Режим команд" : "Live VBT"} · {sportLabel}
        </span>
        {isDrillSport && drill.phase === "active" && (
          <span className="atlant-hud-pill !border-orange-200 !text-orange-600 !text-[9px]">
            Запись удара
          </span>
        )}
      </div>

      <div className="absolute bottom-6 right-4 left-4 z-30 flex gap-2">
        <Button
          size="lg"
          variant="ghost"
          className="!w-auto flex-1 !bg-white/90 !text-slate-700"
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
  );
}
