"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { NormalizedLandmark } from "@/types";
import type { Sport, StrengthExercise } from "@/types";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import SilhouetteGuide from "@/components/camera/SilhouetteGuide";
import { analyzeSilhouetteFit } from "@/lib/camera/silhouetteFit";
import {
  buildArmReachCalibration,
  MATEBOOK_14_2025,
} from "@/lib/camera/cameraCalibration";
import { LM, dist } from "@/lib/pose/landmarks";
import { speakGuidance } from "@/lib/ai/speech";
import { isMobileDevice } from "@/lib/camera/mobileCamera";
import { useAppStore } from "@/store/useAppStore";

const HOLD_FRAMES = 14;
const AUTO_START_SEC = 3;
const CALIB_SAMPLE_FRAMES = 24;

interface SilhouetteSetupGateProps {
  sport: Sport;
  exercise?: StrengthExercise | null;
  landmarksRef: RefObject<NormalizedLandmark[] | null>;
  active: boolean;
  heightCm?: number;
  /** training = удары; scan = биосканирование */
  purpose?: "training" | "scan";
  onReady: () => void;
  onSkip?: () => void;
}

export default function SilhouetteSetupGate({
  sport,
  landmarksRef,
  active,
  heightCm = 182,
  purpose = "training",
  onReady,
  onSkip,
}: SilhouetteSetupGateProps) {
  const setCameraCalibration = useAppStore((s) => s.setCameraCalibration);
  const ensureCameraCalibration = useAppStore((s) => s.ensureCameraCalibration);

  const [hint, setHint] = useState("Встаньте в силуэт на экране");
  const [detail, setDetail] = useState("60–70 см от MateBook · лицом к камере");
  const [progress, setProgress] = useState(0);
  const [fit, setFit] = useState(false);
  const [autoSec, setAutoSec] = useState<number | null>(null);

  const holdRef = useRef(0);
  const calibSamplesRef = useRef<number[]>([]);
  const firedRef = useRef(false);
  const spokenIntroRef = useRef(false);
  const fitRef = useRef(false);
  const progressRef = useRef(0);
  const hintRef = useRef(hint);
  const autoSecRef = useRef<number | null>(null);
  const countdownStartedRef = useRef(false);
  const calibSavedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      countdownStartedRef.current = false;
      calibSavedRef.current = false;
      holdRef.current = 0;
      calibSamplesRef.current = [];
      setAutoSec(null);
      autoSecRef.current = null;
      return;
    }
    ensureCameraCalibration();
    if (!spokenIntroRef.current) {
      spokenIntroRef.current = true;
      speakGuidance(
        purpose === "scan" ? "setup:scan-silhouette" : "setup:silhouette",
        purpose === "scan"
          ? isMobileDevice()
            ? "Поставьте телефон на уровень груди, задняя камера. Отойдите на 2 метра — полный рост в силуэте"
            : "Встаньте в силуэт для биоскана. Когда подсветится зелёным — скан начнётся сам"
          : isMobileDevice()
            ? "Телефон на подставке, 1.5–2 м. Впишитесь в силуэт"
            : "Встаньте в силуэт на экране. Когда подсветится зелёным — скан начнётся сам",
        { cooldownMs: 6000 }
      );
    }
  }, [active, ensureCameraCalibration, purpose]);

  useEffect(() => {
    if (!active || firedRef.current) return;

    let raf: number;
    const loop = () => {
      const landmarks = landmarksRef.current;
      const cal =
        useAppStore.getState().cameraCalibration ?? ensureCameraCalibration();

      if (landmarks?.length) {
        const result = analyzeSilhouetteFit(
          landmarks,
          sport,
          heightCm,
          cal
        );

        if (hintRef.current !== result.hint) {
          hintRef.current = result.hint;
          setHint(result.hint);
        }
        setDetail(result.detail);

        if (Math.abs(progressRef.current - result.progress) > 0.02) {
          progressRef.current = result.progress;
          setProgress(result.progress);
        }

        fitRef.current = result.fit;
        setFit(result.fit);

        if (result.progress > 0.72) {
          const ls = landmarks[LM.L_SHOULDER];
          const rs = landmarks[LM.R_SHOULDER];
          const shoulderW = dist(ls, rs);
          if (shoulderW > 0.1) calibSamplesRef.current.push(shoulderW);
          if (calibSamplesRef.current.length >= CALIB_SAMPLE_FRAMES && !calibSavedRef.current) {
            const built = buildArmReachCalibration(
              calibSamplesRef.current,
              MATEBOOK_14_2025.label
            );
            if (built) {
              built.refDistanceM = result.distanceM ?? 0.65;
              setCameraCalibration(built);
              calibSavedRef.current = true;
            }
            calibSamplesRef.current = [];
          }
        } else {
          calibSamplesRef.current = [];
        }

        if (result.fit) {
          holdRef.current += 1;
        } else if (!countdownStartedRef.current) {
          holdRef.current = 0;
          if (autoSecRef.current !== null && !firedRef.current) {
            autoSecRef.current = null;
            setAutoSec(null);
          }
        }

        if (
          holdRef.current >= HOLD_FRAMES &&
          autoSecRef.current === null &&
          !firedRef.current
        ) {
          countdownStartedRef.current = true;
          autoSecRef.current = AUTO_START_SEC;
          setAutoSec(AUTO_START_SEC);
          speakGuidance(
            purpose === "scan" ? "setup:scan-ready" : "setup:ready",
            purpose === "scan"
              ? "Силуэт совпал. Биоскан через три"
              : "Силуэт совпал. Старт через три",
            { cooldownMs: 4000 }
          );
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, landmarksRef, sport, heightCm, ensureCameraCalibration, setCameraCalibration]);

  useEffect(() => {
    if (autoSec === null || firedRef.current) return;

    const t = setTimeout(() => {
      const next = autoSec - 1;
      if (next > 0) {
        speakGuidance(`setup:count:${next}`, String(next), { cooldownMs: 800 });
        autoSecRef.current = next;
        setAutoSec(next);
      } else {
        firedRef.current = true;
        autoSecRef.current = null;
        setAutoSec(null);
        onReady();
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [autoSec, onReady]);

  if (!active) return null;

  const sportTitle =
    purpose === "scan"
      ? "Биоскан"
      : sport === "boxing"
        ? "Бокс"
        : sport === "tennis"
          ? "Теннис"
          : "Силовые";

  return (
    <>
      <SilhouetteGuide
        sport={sport}
        progress={progress}
        fit={fit}
        visible
      />

      <motion.div
        className="absolute inset-0 z-[45] flex flex-col items-center justify-end bg-black/40 px-4 pb-28 pt-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="mb-4 max-w-sm rounded-2xl border border-white/20 bg-slate-900/90 px-4 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
            Настройка · {sportTitle}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            Впишитесь в силуэт
          </h3>
          <p className="mt-2 text-sm text-slate-300">{hint}</p>
          <p className="mt-1 text-xs text-cyan-300/80">{detail}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className={`h-full transition-all ${fit ? "bg-emerald-500" : "bg-cyan-500"}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {autoSec !== null
              ? purpose === "scan"
                ? `Биоскан через ${autoSec}…`
                : `Автостарт через ${autoSec}…`
              : fit
                ? "Держите позу…"
                : purpose === "scan"
                  ? "Силуэт исчезнет, когда начнётся биосканирование"
                  : "Силуэт исчезнет, когда начнётся анализ ударов"}
          </p>
        </div>

        {!fit && autoSec === null && (
          <div className="flex w-full max-w-sm flex-col gap-2">
            <Button size="lg" variant="ghost" onClick={onReady}>
              Продолжить без проверки
            </Button>
            {onSkip && (
              <Button size="lg" variant="ghost" onClick={onSkip}>
                Пропустить
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}
