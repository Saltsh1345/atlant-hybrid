"use client";

import Button from "@/components/ui/Button";
import PoseOverlay from "@/components/camera/PoseOverlay";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAppStore } from "@/store/useAppStore";
import { criticalMusclesFromSession } from "@/lib/three/muscleGroups";
import { computeKinematics, resetVbtState } from "@/lib/pose/vbt";
import {
  LivePulseEstimator,
  computeLiveStress,
  smoothKinematicPulse,
  type PulseSignalSource,
} from "@/lib/vitals/livePulse";
import { useRef, useEffect, useState, useMemo } from "react";
import type { NormalizedLandmark } from "@/types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function TwinVitalCard({
  label,
  value,
  unit,
  hint,
  valueClass,
  barClass,
  barRatio,
}: {
  label: string;
  value: string;
  unit: string;
  hint: string;
  valueClass: string;
  barClass: string;
  barRatio: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-4xl font-bold tabular-nums ${valueClass}`}>
          {value}
        </span>
        <span className="text-sm text-white/45">{unit}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${Math.round(clamp(barRatio, 0, 1) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] leading-snug text-white/40">{hint}</p>
    </div>
  );
}

/** Pose / HUD refresh — keep c8fbcc8 style throttling to avoid max-update-depth */
const UI_MS = 150;
/** Vitals (pulse/stress) can update a bit slower — still feels live */
const VITALS_MS = 500;

function pulseHint(
  personSeen: boolean,
  source: PulseSignalSource,
  healthResting: boolean
): string {
  if (!personSeen) return "человек не в кадре";
  if (source === "camera") return "камера · оценка (не мед. rPPG)";
  if (source === "health" || healthResting)
    return "Health + движение · оценка";
  if (source === "kinematics") return "движение · оценка";
  return "нет сигнала";
}

function stressHint(
  personSeen: boolean,
  healthStress: boolean
): string {
  if (!personSeen) return "человек не в кадре";
  if (healthStress) return "Health + пульс/кинематика · оценка";
  return "пульс + кинематика · оценка";
}

export default function TwinLiveScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [pulseBpm, setPulseBpm] = useState(72);
  const [stressLevel, setStressLevel] = useState(35);
  const [personSeen, setPersonSeen] = useState(false);
  const [pulseSource, setPulseSource] = useState<PulseSignalSource>("none");
  const [vitalsDisplay, setVitalsDisplay] = useState<"live" | "hold" | "none">(
    "none"
  );

  const personSeenRef = useRef(false);
  const lastUiAtRef = useRef(0);
  const lastVitalsAtRef = useRef(0);
  const pulseBpmRef = useRef(72);
  const stressLevelRef = useRef(35);
  const pulseSourceRef = useRef<PulseSignalSource>("none");
  const vitalsDisplayRef = useRef<"live" | "hold" | "none">("none");
  const pulseEstimatorRef = useRef<LivePulseEstimator | null>(null);

  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const lastSession = useAppStore((s) => s.lastSession);
  const profile = useAppStore((s) => s.profile);
  const selectedSport = useAppStore((s) => s.selectedSport);
  const healthReadiness = useAppStore((s) => s.healthReadiness);
  const healthConnected = useAppStore((s) => s.healthConnected);
  const updateKinematics = useAppStore((s) => s.updateKinematics);
  const setPhase = useAppStore((s) => s.setPhase);

  const { cameraStatus, cameraError } = useCamera(videoRef, true);
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  const tickRef = useRef(tick);
  const selectedSportRef = useRef(selectedSport);
  const heightCmRef = useRef(profile?.height ?? 175);
  const updateKinematicsRef = useRef(updateKinematics);
  const healthRestingBpmRef = useRef<number | null>(null);
  const healthStressRef = useRef<number | null>(null);
  const healthConnectedRef = useRef(healthConnected);

  const healthRestingBpm =
    healthReadiness?.metrics?.heartRate?.restingBpm ?? null;
  const healthStress = healthReadiness?.metrics?.stress?.latest ?? null;

  tickRef.current = tick;
  selectedSportRef.current = selectedSport;
  heightCmRef.current = profile?.height ?? 175;
  updateKinematicsRef.current = updateKinematics;
  healthRestingBpmRef.current = healthRestingBpm;
  healthStressRef.current = healthStress;
  healthConnectedRef.current = healthConnected;

  const criticalMeshes = useMemo(
    () => criticalMusclesFromSession(lastSession),
    [lastSession]
  );

  const pulseValue =
    vitalsDisplay === "none" ? "—" : String(Math.round(pulseBpm));
  const stressValue =
    vitalsDisplay === "none" ? "—" : String(Math.round(stressLevel));
  const pulseBar =
    vitalsDisplay === "none" ? 0 : (pulseBpm - 48) / (185 - 48);
  const stressBar = vitalsDisplay === "none" ? 0 : stressLevel / 100;

  useEffect(() => {
    resetVbtState();
    pulseEstimatorRef.current = new LivePulseEstimator();
    pulseEstimatorRef.current.reset(healthRestingBpmRef.current ?? 72);
    return () => {
      resetVbtState();
      pulseEstimatorRef.current = null;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let alive = true;

    const publishVitals = (
      nextBpm: number,
      nextStress: number,
      nextSource: PulseSignalSource,
      display: "live" | "hold"
    ) => {
      const bpmRounded = Math.round(nextBpm);
      const stressRounded = Math.round(nextStress);

      pulseBpmRef.current = nextBpm;
      stressLevelRef.current = nextStress;

      setPulseBpm((prev) => (prev !== bpmRounded ? bpmRounded : prev));
      setStressLevel((prev) =>
        prev !== stressRounded ? stressRounded : prev
      );

      if (pulseSourceRef.current !== nextSource) {
        pulseSourceRef.current = nextSource;
        setPulseSource(nextSource);
      }
      if (vitalsDisplayRef.current !== display) {
        vitalsDisplayRef.current = display;
        setVitalsDisplay(display);
      }
    };

    const loop = () => {
      if (!alive) return;
      const lm = tickRef.current();
      const now = performance.now();
      const dueUi = now - lastUiAtRef.current >= UI_MS;
      const dueVitals = now - lastVitalsAtRef.current >= VITALS_MS;

      if (lm) {
        landmarksRef.current = lm;

        const sport =
          selectedSportRef.current === "boxing" ||
          selectedSportRef.current === "tennis"
            ? selectedSportRef.current
            : "strength";
        const heightCm = heightCmRef.current;
        const k = computeKinematics(lm, sport, heightCm);
        updateKinematicsRef.current(k);

        const resting = healthRestingBpmRef.current ?? 72;
        const estimator = pulseEstimatorRef.current;
        const camPulse = estimator?.sample(videoRef.current, lm, now) ?? null;

        let nextBpm: number;
        let nextSource: PulseSignalSource;

        if (camPulse && camPulse.confidence >= 0.35) {
          nextBpm = camPulse.bpm;
          nextSource = "camera";
        } else {
          nextBpm = smoothKinematicPulse(
            pulseBpmRef.current,
            k.velocityMs,
            k.fatiguePercent,
            resting,
            true
          );
          nextSource =
            healthConnectedRef.current && healthRestingBpmRef.current != null
              ? "health"
              : "kinematics";
        }

        nextBpm = clamp(nextBpm, 48, 185);
        const nextStress = computeLiveStress({
          bpm: nextBpm,
          restingBpm: resting,
          fatiguePercent: k.fatiguePercent,
          velocityMs: k.velocityMs,
          healthStress: healthStressRef.current,
          personPresent: true,
          prev: stressLevelRef.current,
        });

        // Keep float targets in refs between throttled publishes
        pulseBpmRef.current = nextBpm;
        stressLevelRef.current = nextStress;

        if (!personSeenRef.current) {
          personSeenRef.current = true;
          setPersonSeen(true);
        }

        if (dueUi) {
          lastUiAtRef.current = now;
          setLandmarks(lm);
        }

        if (dueVitals) {
          lastVitalsAtRef.current = now;
          publishVitals(nextBpm, nextStress, nextSource, "live");
        }
      } else {
        landmarksRef.current = null;

        const resting = healthRestingBpmRef.current ?? 72;
        const nextBpm = smoothKinematicPulse(
          pulseBpmRef.current,
          0,
          0,
          resting,
          false
        );
        const nextStress = computeLiveStress({
          bpm: nextBpm,
          restingBpm: resting,
          fatiguePercent: 0,
          velocityMs: 0,
          healthStress: healthStressRef.current,
          personPresent: false,
          prev: stressLevelRef.current,
        });
        pulseBpmRef.current = nextBpm;
        stressLevelRef.current = nextStress;

        if (personSeenRef.current) {
          personSeenRef.current = false;
          if (dueUi) {
            lastUiAtRef.current = now;
            setPersonSeen(false);
            setLandmarks(null);
          }
        }

        if (dueVitals && vitalsDisplayRef.current !== "none") {
          lastVitalsAtRef.current = now;
          publishVitals(
            nextBpm,
            nextStress,
            pulseSourceRef.current,
            "hold"
          );
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const pulseHintText = pulseHint(
    personSeen,
    pulseSource,
    healthConnected && healthRestingBpm != null
  );
  const stressHintText = stressHint(
    personSeen,
    healthConnected && healthStress != null
  );

  // Hold last values when briefly out of frame, but show status
  const showPulseHint =
    !personSeen && vitalsDisplay === "hold"
      ? "человек не в кадре · последнее"
      : !personSeen && vitalsDisplay === "none"
        ? "нет сигнала"
        : pulseHintText;
  const showStressHint =
    !personSeen && vitalsDisplay === "hold"
      ? "человек не в кадре · последнее"
      : !personSeen && vitalsDisplay === "none"
        ? "нет сигнала"
        : stressHintText;

  return (
    <div className="flex min-h-dvh flex-col bg-[#05070c] text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => setPhase("dashboard")}
          className="text-sm text-white/70 hover:text-white"
        >
          ← Дашборд
        </button>
        <span className="text-white/25">·</span>
        <h1 className="text-sm font-semibold tracking-wide sm:text-base">
          Цифровой двойник
        </h1>
        {personSeen && (
          <span className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
            Онлайн
          </span>
        )}
        {!personSeen && vitalsDisplay === "hold" && (
          <span className="ml-auto rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
            Нет в кадре
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row lg:gap-4 lg:p-4">
        {/* LEFT — Twin composition (~28%) */}
        <aside className="order-2 flex w-full shrink-0 flex-col gap-2 lg:order-1 lg:w-[28%] lg:min-h-0">
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Состав тела
          </p>
          <div className="min-h-[260px] flex-1 overflow-hidden rounded-2xl lg:min-h-0">
            <BiomechTwinPanel
              latchedBody={latchedBody}
              locked={bodyDataLocked}
              lastSession={lastSession}
              criticalMeshes={criticalMeshes}
              landmarks={landmarks}
              live
              showHud
              calm
              className="!h-full min-h-[260px]"
            />
          </div>
        </aside>

        {/* CENTER — Live camera (primary) */}
        <main className="relative order-1 min-h-[48vh] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black lg:order-2 lg:min-h-0">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
            playsInline
            muted
            autoPlay
          />

          <CameraStatusOverlay
            cameraStatus={cameraStatus}
            cameraError={cameraError}
            poseReady={poseReady}
            poseError={poseError}
          />
          <PoseOverlay landmarks={landmarks} />

          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/90">
              Живая камера
            </p>
            <p className="text-[10px] text-white/55">
              {personSeen
                ? "Поза и аналитика на человеке"
                : "Встаньте в кадр для трекинга"}
            </p>
          </div>

          {vitalsDisplay !== "none" && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2">
              <span className="rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm">
                BPM {pulseValue}
                {!personSeen ? " · вне кадра" : ""}
              </span>
              <span className="rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm">
                Стресс {stressValue}
              </span>
              {latchedBody && (
                <span className="rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm">
                  Жир {latchedBody.fatPercent}% · Мышцы{" "}
                  {latchedBody.musclePercent}%
                </span>
              )}
            </div>
          )}
        </main>

        {/* RIGHT — Pulse / Stress widgets (~28%) */}
        <aside className="order-3 flex w-full shrink-0 flex-col gap-3 lg:w-[28%] lg:overflow-y-auto">
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Виджеты
          </p>

          <TwinVitalCard
            label="Пульс"
            value={pulseValue}
            unit="BPM"
            hint={showPulseHint}
            valueClass="text-rose-400"
            barClass="bg-rose-400"
            barRatio={pulseBar}
          />

          <TwinVitalCard
            label="Стресс"
            value={stressValue}
            unit="/ 100"
            hint={showStressHint}
            valueClass="text-amber-400"
            barClass="bg-amber-400"
            barRatio={stressBar}
          />

          {latchedBody && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Сводка скана
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] uppercase text-orange-300/80">Жир</p>
                  <p className="text-2xl font-bold tabular-nums text-orange-200">
                    {latchedBody.fatPercent}
                    <span className="text-sm font-normal text-white/40">%</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-cyan-300/80">Мышцы</p>
                  <p className="text-2xl font-bold tabular-nums text-cyan-200">
                    {latchedBody.musclePercent}
                    <span className="text-sm font-normal text-white/40">%</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="shrink-0 border-t border-white/10 px-4 py-3">
        <Button
          size="lg"
          variant="secondary"
          className="w-full sm:mx-auto sm:block sm:max-w-xs"
          onClick={() => setPhase("dashboard")}
        >
          На дашборд
        </Button>
      </footer>
    </div>
  );
}
