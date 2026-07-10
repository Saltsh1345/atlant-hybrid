"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { NormalizedLandmark } from "@/types";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { analyzeCameraSetup } from "@/lib/camera/cameraSetupCoach";
import {
  buildArmReachCalibration,
  formatDistance,
  MATEBOOK_14_2025,
} from "@/lib/camera/cameraCalibration";
import {
  estimateDistanceMeters,
  distanceCoachHint,
} from "@/lib/camera/distanceEstimator";
import { LM, dist } from "@/lib/pose/landmarks";
import { speakGuidance } from "@/lib/ai/speech";
import { useAppStore } from "@/store/useAppStore";

type CalibPhase = "camera" | "arm" | "step_back" | "done";

const HOLD_FRAMES = 18;
const ARM_MS = 1800;

interface CameraCalibGateProps {
  landmarksRef: RefObject<NormalizedLandmark[] | null>;
  active: boolean;
  heightCm?: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function CameraCalibGate({
  landmarksRef,
  active,
  heightCm,
  onComplete,
  onSkip,
}: CameraCalibGateProps) {
  const cameraCalibration = useAppStore((s) => s.cameraCalibration);
  const setCameraCalibration = useAppStore((s) => s.setCameraCalibration);
  const ensureCameraCalibration = useAppStore((s) => s.ensureCameraCalibration);

  const [phase, setPhase] = useState<CalibPhase>("camera");
  const [hint, setHint] = useState("Настройка камеры MateBook 14");
  const [detail, setDetail] = useState(MATEBOOK_14_2025.label);
  const [progress, setProgress] = useState(0);
  const [armProgress, setArmProgress] = useState(0);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  const holdRef = useRef(0);
  const armSamplesRef = useRef<number[]>([]);
  const armStartRef = useRef(0);
  const spokenRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);
  const hintRef = useRef(hint);
  const detailRef = useRef(detail);
  const progressRef = useRef(progress);
  const armProgressRef = useRef(armProgress);
  const distanceRef = useRef(distanceM);
  phaseRef.current = phase;

  useEffect(() => {
    if (!active) return;
    ensureCameraCalibration();
  }, [active, ensureCameraCalibration]);

  useEffect(() => {
    if (!active) return;

    let raf: number;
    const loop = () => {
      const landmarks = landmarksRef.current;
      if (!landmarks?.length) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const cal =
        useAppStore.getState().cameraCalibration ?? ensureCameraCalibration();
      const phaseNow = phaseRef.current;

      if (phaseNow === "camera") {
        const cam = analyzeCameraSetup(landmarks);
        if (hintRef.current !== cam.hint) {
          hintRef.current = cam.hint;
          setHint(cam.hint);
        }
        if (detailRef.current !== cam.detail) {
          detailRef.current = cam.detail;
          setDetail(cam.detail);
        }
        if (Math.abs(progressRef.current - cam.progress) > 0.02) {
          progressRef.current = cam.progress;
          setProgress(cam.progress);
        }

        if (cam.ready) {
          holdRef.current += 1;
          if (holdRef.current >= HOLD_FRAMES) {
            holdRef.current = 0;
            phaseRef.current = "arm";
            setPhase("arm");
            if (spokenRef.current !== "arm") {
              spokenRef.current = "arm";
              speakGuidance(
                "calib:arm",
                "Дотянитесь пальцами до экрана и держите 2 секунды",
                { cooldownMs: 5000 }
              );
            }
          }
        } else {
          holdRef.current = 0;
        }
      } else if (phaseNow === "arm") {
        const ls = landmarks[LM.L_SHOULDER];
        const rs = landmarks[LM.R_SHOULDER];
        const shoulderW = dist(ls, rs);
        const vis = ((ls.visibility ?? 0) + (rs.visibility ?? 0)) / 2;

        if (armStartRef.current === 0) armStartRef.current = Date.now();

        const elapsed = Date.now() - armStartRef.current;
        const pct = Math.min(1, elapsed / ARM_MS);
        if (Math.abs(armProgressRef.current - pct) > 0.02) {
          armProgressRef.current = pct;
          setArmProgress(pct);
        }

        const nextHint =
          vis > 0.45 && shoulderW > 0.1
            ? "Дотянитесь пальцами до экрана — не двигайтесь"
            : "Встаньте ближе — плечи не видны";
        const nextDetail =
          vis > 0.45 && shoulderW > 0.1
            ? `Плечи ${shoulderW.toFixed(2)} · сбор ${Math.round(pct * 100)}%`
            : "Ладонь к экрану, лицом к камере";

        if (hintRef.current !== nextHint) {
          hintRef.current = nextHint;
          setHint(nextHint);
        }
        if (detailRef.current !== nextDetail) {
          detailRef.current = nextDetail;
          setDetail(nextDetail);
        }

        if (vis > 0.45 && shoulderW > 0.1) {
          armSamplesRef.current.push(shoulderW);
        }

        if (elapsed >= ARM_MS) {
          const built = buildArmReachCalibration(armSamplesRef.current);
          if (built) setCameraCalibration(built);
          armStartRef.current = 0;
          armSamplesRef.current = [];
          phaseRef.current = "step_back";
          setPhase("step_back");
          spokenRef.current = null;
          speakGuidance(
            "calib:back",
            "Слегка отойдите от экрана — шестьдесят, семьдесят сантиметров",
            { cooldownMs: 5000 }
          );
        }
      } else if (phaseNow === "step_back") {
        const est = estimateDistanceMeters(
          landmarks,
          heightCm ?? 182,
          "laptop",
          cal,
          true
        );
        if (est) {
          if (distanceRef.current !== est.meters) {
            distanceRef.current = est.meters;
            setDistanceM(est.meters);
          }
          const nextHint = distanceCoachHint(est, "boxing");
          if (hintRef.current !== nextHint) {
            hintRef.current = nextHint;
            setHint(nextHint);
          }
          const nextProg = est.meters >= est.targetMin - 0.08 &&
            est.meters <= est.targetMax + 0.15
            ? 1
            : 0.5;
          if (Math.abs(progressRef.current - nextProg) > 0.02) {
            progressRef.current = nextProg;
            setProgress(nextProg);
          }

          if (nextProg === 1) {
            holdRef.current += 1;
            if (holdRef.current >= HOLD_FRAMES) {
              phaseRef.current = "done";
              onComplete();
            }
          } else {
            holdRef.current = 0;
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    active,
    landmarksRef,
    ensureCameraCalibration,
    heightCm,
    setCameraCalibration,
    onComplete,
  ]);

  if (!active) return null;

  return (
    <motion.div
      className="absolute inset-0 z-[48] flex flex-col items-center justify-end bg-black/60 px-4 pb-28 pt-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-4 max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900/95 px-4 py-4 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
          Калибровка · {MATEBOOK_14_2025.label}
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">
          {phase === "camera" && "1/3 · Камера"}
          {phase === "arm" && "2/3 · Дистанция руки"}
          {phase === "step_back" && "3/3 · 60–70 см от экрана"}
        </h3>
        <p className="mt-2 text-sm text-slate-200">{hint}</p>
        <p className="mt-1 text-xs text-slate-400">{detail}</p>
        {distanceM != null && phase === "step_back" && (
          <p className="mt-2 font-mono text-lg font-bold text-cyan-300">
            {formatDistance(distanceM)}
          </p>
        )}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full bg-cyan-500 transition-all"
            style={{
              width: `${Math.round((phase === "arm" ? armProgress : progress) * 100)}%`,
            }}
          />
        </div>
        {phase === "camera" && (
          <ul className="mt-3 space-y-1 text-left text-[11px] text-slate-400">
            <li>· Крышка ноутбука откиньте на 110–120°</li>
            <li>· Свет в лицо, не сидите спиной к окну</li>
            <li>· Голова в верхней трети кадра</li>
          </ul>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button size="lg" variant="ghost" onClick={onSkip}>
          Пропустить калибровку
        </Button>
      </div>
    </motion.div>
  );
}
