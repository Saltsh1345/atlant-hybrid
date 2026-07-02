"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import LiveScanGrid from "@/components/visual/LiveScanGrid";
import MuscleFatOverlay from "@/components/camera/MuscleFatOverlay";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import CalibrationProgress from "@/components/calibration/CalibrationProgress";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAppStore } from "@/store/useAppStore";
import { CALIBRATION_SCRIPT } from "@/lib/calibration/script";
import {
  isPoseGuideStep,
  poseGuideHint,
  waitForLivePose,
} from "@/lib/calibration/poseGuide";
import { analyzeScanFrame, type ScanAnalysis } from "@/lib/calibration/scanAnalysis";
import { coachSpeak, stopSpeaking } from "@/lib/ai/speech";
import type { CalibrationStep, NormalizedLandmark } from "@/types";

export default function CalibrationScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const scanRef = useRef<ScanAnalysis | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [running, setRunning] = useState(false);
  const [showComposition, setShowComposition] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [guideHint, setGuideHint] = useState("");
  const [poseOk, setPoseOk] = useState(false);
  const [calibrationStep, setStepLocal] = useState<CalibrationStep>("idle");
  const [scanStatus, setScanStatus] = useState("");
  const [liveMetrics, setLiveMetrics] = useState("");
  const [guideProgress, setGuideProgress] = useState(0);
  const [sweepPhase, setSweepPhase] = useState(0);

  const setPhase = useAppStore((s) => s.setPhase);
  const latchBodyData = useAppStore((s) => s.latchBodyData);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const setCalibrationStep = useAppStore((s) => s.setCalibrationStep);
  const resetCalibration = useAppStore((s) => s.resetCalibration);
  const unlockForRescan = useAppStore((s) => s.unlockForRescan);
  const rescanPending = useAppStore((s) => s.rescanPending);
  const clearRescanPending = useAppStore((s) => s.clearRescanPending);

  const { cameraStatus, cameraError } = useCamera(videoRef, true);
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  useEffect(() => {
    resetCalibration();
    if (rescanPending) {
      unlockForRescan();
      clearRescanPending();
    }
    return () => stopSpeaking();
  }, [resetCalibration, rescanPending, unlockForRescan, clearRescanPending]);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let raf: number;
    const loop = () => {
      setSweepPhase(((performance.now() - start) % 3000) / 3000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      const lm = tick();
      if (lm) {
        landmarksRef.current = lm;
        setLandmarks(lm);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  const speakAsync = (text: string, emphasis = false) =>
    new Promise<void>((resolve) =>
      coachSpeak(text, { emphasis, onEnd: resolve })
    );

  const waitCameraPose = async (step: CalibrationStep) => {
    setPoseOk(false);
    setGuideHint(poseGuideHint(step));
    await waitForLivePose(
      step,
      () => landmarksRef.current,
      (progress, feedback, metrics) => {
        setGuideProgress(progress);
        setScanStatus(feedback);
        setLiveMetrics(metrics);
        setPoseOk(progress >= 0.88);
      },
      (feedback) => {
        coachSpeak(feedback, { emphasis: true });
      }
    );
    setPoseOk(true);
  };

  const runScript = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setShowComposition(false);
    setScanStatus("Камера анализирует…");
    scanRef.current = null;

    for (const line of CALIBRATION_SCRIPT) {
      setStepLocal(line.step);
      setCalibrationStep(line.step);
      setGuideHint(isPoseGuideStep(line.step) ? poseGuideHint(line.step) : "");
      setPoseOk(false);
      setScriptText(line.text);

      await speakAsync(line.text);

      if (isPoseGuideStep(line.step)) {
        await waitCameraPose(line.step);
        if (line.step === "body_analysis") {
          scanRef.current = analyzeScanFrame(landmarksRef.current);
          setScanStatus(
            `✓ Скан: видимость ${Math.round((scanRef.current.bodyVisibleScore ?? 0) * 100)}%`
          );
        }
        continue;
      }

      if (line.step === "clothing_check") {
        await waitCameraPose("body_analysis");
        const analysis = analyzeScanFrame(landmarksRef.current);
        scanRef.current = analysis;
        if (analysis.clothingLikely) {
          setScanStatus(`⚠ ${analysis.clothingReason}`);
          await speakAsync(analysis.clothingReason);
        } else {
          setScanStatus("✓ Одежда не мешает");
        }
        continue;
      }

      if (line.step === "biomech_ready") {
        await waitCameraPose("center");
        const latched = latchBodyData(scanRef.current);
        if (latched) {
          setScanStatus(
            `🔒 Data Latch · жир ${latched.fatPercent}% · мышцы ${latched.musclePercent}%`
          );
          await speakAsync(
            `Данные зафиксированы. Жир ${latched.fatPercent}%, мышцы ${latched.musclePercent}%.`
          );
        } else {
          setScanStatus("Ошибка — заполните профиль");
          await speakAsync("Не удалось зафиксировать. Заполните профиль.");
        }
        continue;
      }

      if (line.step === "visualization") {
        setShowComposition(true);
        await speakAsync(line.text);
      }
    }

    setStepLocal("complete");
    setCalibrationStep("complete");
    setShowComposition(true);
    setGuideHint("");
    setRunning(false);
  }, [running, latchBodyData, setCalibrationStep]);

  const scanning = running && !showComposition;

  return (
    <div className="relative min-h-dvh bg-slate-100">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full scale-x-[-1] object-contain ${
          showComposition ? "hidden" : "w-full"
        }`}
        playsInline
        muted
        autoPlay
      />

      <LiveScanGrid active={scanning} />
      {scanning && (
        <div className="scan-sweep-wrap">
          <div className="scan-sweep" />
        </div>
      )}
      <MuscleFatOverlay
        landmarks={landmarks}
        active={scanning}
        sweepPhase={sweepPhase}
      />

      <CameraStatusOverlay
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        poseReady={poseReady}
        poseError={poseError}
      />

      {scanning && (
        <div className="absolute left-0 right-0 top-0 z-20 px-3 pt-3">
          <CalibrationProgress current={calibrationStep} />
          <p className="mt-1 text-center font-mono text-[9px] text-cyan-800">
            [CAM] {liveMetrics || "ожидание позы…"}
          </p>
        </div>
      )}

      {showComposition && latchedBody && (
        <div className="absolute left-0 top-0 bottom-0 z-20 flex w-[55%] flex-col justify-center bg-white px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Data Latch · Состав тела
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Цифровой двойник
          </h2>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="h-4 w-4 rounded bg-amber-500" />
              <div>
                <p className="text-xs text-amber-800">Жировая зона · торс</p>
                <p className="text-lg font-bold text-amber-600">
                  {latchedBody.fatPercent}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="h-4 w-4 rounded bg-emerald-500" />
              <div>
                <p className="text-xs text-emerald-800">Мышцы · конечности</p>
                <p className="text-lg font-bold text-emerald-600">
                  {latchedBody.musclePercent}%
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Справа — 3D mesh: янтарный торс, зелёные мышцы, циановая сетка
          </p>
        </div>
      )}

      <AnimatePresence>
        {showComposition && latchedBody && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="absolute top-0 right-0 bottom-0 z-30 w-[45%] border-l border-cyan-200/40 bg-white shadow-2xl"
          >
            <BiomechTwinPanel latchedBody={latchedBody} locked tall showHud />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`absolute bottom-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-6 pt-12 ${
          showComposition ? "left-0 right-[45%]" : "left-0 right-0"
        }`}
      >
        {guideHint && scanning && (
          <div className="mb-2">
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-150"
                style={{ width: `${Math.round(guideProgress * 100)}%` }}
              />
            </div>
            <p
              className={`text-center text-sm font-semibold ${
                poseOk ? "text-emerald-600" : "text-cyan-800"
              }`}
            >
              {scanStatus || guideHint}
            </p>
          </div>
        )}

        {scriptText && (
          <div className="mb-3 rounded-xl border border-cyan-200/60 bg-white/95 px-3 py-2 backdrop-blur">
            <p className="text-center text-xs leading-relaxed text-slate-700">
              🎙 {scriptText}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {!running && !showComposition && (
            <Button size="lg" onClick={runScript}>
              Запустить биосканирование
            </Button>
          )}
          {showComposition && bodyDataLocked && (
            <>
              <Button size="lg" onClick={() => setPhase("dashboard")}>
                На дашборд
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setPhase("sport-select")}
              >
                К выбору спорта
              </Button>
            </>
          )}
          <Button size="lg" variant="ghost" onClick={() => setPhase("dashboard")}>
            Назад
          </Button>
        </div>
      </div>
    </div>
  );
}
