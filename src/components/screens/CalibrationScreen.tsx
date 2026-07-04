"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import LiveScanGrid from "@/components/visual/LiveScanGrid";
import AutoFrameViewport from "@/components/camera/AutoFrameViewport";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import CalibrationProgress from "@/components/calibration/CalibrationProgress";
import { useCamera, usePoseTracker } from "@/hooks/usePoseTracker";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import { CALIBRATION_SCRIPT } from "@/lib/calibration/script";
import {
  isPoseGuideStep,
  poseGuideHint,
  waitForLivePose,
  requestPoseSkip,
} from "@/lib/calibration/poseGuide";
import {
  buildBodyScanJson,
  pushBodyScanSample,
  type BodyScanSample,
} from "@/lib/calibration/bodyScanPayload";
import { speakScript, speakGuidance, stopSpeaking } from "@/lib/ai/speech";
import type { CalibrationStep, LatchedBodyData, NormalizedLandmark } from "@/types";

export default function CalibrationScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const samplesRef = useRef<BodyScanSample[]>([]);
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
  const [analyzing, setAnalyzing] = useState(false);

  const setPhase = useAppStore((s) => s.setPhase);
  const setFocusSportPicker = useDashboardLayoutStore((s) => s.setFocusSportPicker);
  const latchBodyResult = useAppStore((s) => s.latchBodyResult);
  const latchBodyData = useAppStore((s) => s.latchBodyData);
  const latchedBody = useAppStore((s) => s.latchedBody);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const setCalibrationStep = useAppStore((s) => s.setCalibrationStep);
  const resetCalibration = useAppStore((s) => s.resetCalibration);
  const unlockForRescan = useAppStore((s) => s.unlockForRescan);
  const clearRescanPending = useAppStore((s) => s.clearRescanPending);
  const ensureProfile = useAppStore((s) => s.ensureProfile);
  const profile = useAppStore((s) => s.profile);

  const { cameraStatus, cameraError } = useCamera(videoRef, true);
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  useEffect(() => {
    resetCalibration();
    const pending = useAppStore.getState().rescanPending;
    if (pending) {
      unlockForRescan();
      clearRescanPending();
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    let raf: number;
    let frame = 0;
    const loop = () => {
      const lm = tickRef.current();
      if (lm) {
        landmarksRef.current = lm;
        frame += 1;
        if (frame % 4 === 0) setLandmarks(lm);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const speakAsync = (text: string) =>
    new Promise<void>((resolve) =>
      speakScript(`cal:line:${text.slice(0, 40)}`, text, {
        emphasis: false,
        onEnd: resolve,
      })
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
        if (running) {
          pushBodyScanSample(samplesRef.current, landmarksRef.current, step);
        }
      },
      (feedback) => {
        speakGuidance(`cal:pose:${step}`, feedback, { cooldownMs: 12000 });
      }
    );
    setPoseOk(true);
  };

  const sampleForDuration = async (step: CalibrationStep, ms: number) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      pushBodyScanSample(samplesRef.current, landmarksRef.current, step);
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  const runGeminiAnalysis = async (): Promise<LatchedBodyData | null> => {
    const p = profile ?? ensureProfile();
    const scan = buildBodyScanJson(p, samplesRef.current);
    setScanStatus("Gemini анализирует осанку и состав тела…");

    try {
      const res = await fetch("/api/gemini/body-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan, weight: p.weight }),
      });
      const data = await res.json();
      if (res.ok && data.latched) {
        if (data.source !== "gemini") {
          setScanStatus("Локальный анализ состава (Gemini недоступен)");
        }
        return data.latched as LatchedBodyData;
      }
      setScanStatus("Локальный анализ состава");
    } catch {
      setScanStatus("Сеть недоступна — локальный расчёт");
    }

    // Fallback without locking — caller will latch
    return latchBodyData(null);
  };

  const runScript = useCallback(async () => {
    if (running) return;
    ensureProfile();
    setRunning(true);
    setShowComposition(false);
    setAnalyzing(false);
    setScanStatus("Камера готова");
    samplesRef.current = [];

    for (const line of CALIBRATION_SCRIPT) {
      setStepLocal(line.step);
      setCalibrationStep(line.step);
      setGuideHint(line.poseGuide ? poseGuideHint(line.step) : "");
      setPoseOk(false);
      setScriptText(line.text);

      await speakAsync(line.text);

      if (line.step === "analyzing") {
        setAnalyzing(true);
        setScanStatus("Сборка JSON и отправка в Gemini…");
        const latched = await runGeminiAnalysis();
        if (latched && !useAppStore.getState().bodyDataLocked) {
          latchBodyResult(latched);
        }
        const body = useAppStore.getState().latchedBody;
        if (body) {
          setScanStatus(
            `✓ Жир ${body.fatPercent}% · мышцы ${body.musclePercent}% · ${
              body.source === "gemini" ? "Gemini" : "локально"
            }`
          );
          await speakAsync(
            `Анализ готов. Жир ${body.fatPercent} процента, мышцы ${body.musclePercent}.`
          );
        }
        setAnalyzing(false);
        continue;
      }

      if (line.step === "visualization") {
        setShowComposition(true);
        continue;
      }

      if (line.poseGuide && isPoseGuideStep(line.step)) {
        await waitCameraPose(line.step);
        await sampleForDuration(line.step, Math.min(line.durationMs, 1500));
        continue;
      }

      // Timed steps (e.g. rotate_360) — sample continuously
      if (line.sample) {
        await sampleForDuration(line.step, line.durationMs);
      } else {
        await new Promise((r) => setTimeout(r, line.durationMs));
      }
    }

    setStepLocal("complete");
    setCalibrationStep("complete");
    setShowComposition(true);
    setGuideHint("");
    setRunning(false);
  }, [
    running,
    latchBodyData,
    latchBodyResult,
    setCalibrationStep,
    ensureProfile,
    profile,
  ]);

  const scanning = running && !showComposition;

  return (
    <div className="relative min-h-dvh bg-slate-950">
      {!showComposition && (
        <AutoFrameViewport
          videoRef={videoRef}
          landmarks={landmarks}
          active={cameraStatus === "ready" && poseReady}
          voiceNudges={
            calibrationStep === "upper_body" ||
            calibrationStep === "arms_up" ||
            calibrationStep === "step_back"
          }
        >
          <LiveScanGrid active={scanning} />
          {scanning && (
            <div className="scan-sweep-wrap">
              <div className="scan-sweep" />
            </div>
          )}
        </AutoFrameViewport>
      )}

      <CameraStatusOverlay
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        poseReady={poseReady}
        poseError={poseError}
      />

      {scanning && (
        <div className="absolute left-0 right-0 top-0 z-20 px-3 pt-3">
          <CalibrationProgress current={calibrationStep} />
          <p className="mt-1 text-center font-mono text-[9px] text-cyan-300">
            [SCAN] {liveMetrics || (analyzing ? "Gemini…" : "ожидание…")}
          </p>
        </div>
      )}

      {showComposition && latchedBody && (
        <div className="absolute bottom-0 left-0 top-0 z-20 flex w-full flex-col justify-center overflow-y-auto bg-slate-950 px-5 py-8 lg:w-[52%]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Gemini · состав тела
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Цифровой двойник</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-[10px] uppercase text-amber-200/80">Жир</p>
              <p className="text-2xl font-bold text-amber-400">
                {latchedBody.fatPercent}%
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-[10px] uppercase text-emerald-200/80">Мышцы</p>
              <p className="text-2xl font-bold text-emerald-400">
                {latchedBody.musclePercent}%
              </p>
            </div>
          </div>

          {latchedBody.posture && (
            <div className="mt-4 space-y-1.5 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
              <p>
                <span className="text-cyan-400">Позвоночник:</span>{" "}
                {latchedBody.posture.spine}
              </p>
              <p>
                <span className="text-cyan-400">Плечи:</span>{" "}
                {latchedBody.posture.shoulders}
              </p>
              <p>
                <span className="text-cyan-400">Таз:</span>{" "}
                {latchedBody.posture.hips}
              </p>
              <p>
                <span className="text-cyan-400">Ось:</span>{" "}
                {latchedBody.posture.alignment}
              </p>
            </div>
          )}

          {latchedBody.geminiReport && (
            <p className="mt-4 text-sm leading-relaxed text-slate-200">
              {latchedBody.geminiReport}
            </p>
          )}

          <p className="mt-3 text-[10px] text-slate-500">
            Жир на двойнике — тёплый оттенок в зонах анализа (живот, бёдра…). Без
            «колбас» на руках.
            {latchedBody.source === "gemini" ? " · Gemini" : " · локальный расчёт"}
          </p>
        </div>
      )}

      <AnimatePresence>
        {showComposition && latchedBody && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="absolute bottom-0 right-0 top-0 z-30 hidden w-[48%] border-l border-cyan-500/20 bg-slate-950 shadow-2xl lg:block"
          >
            <BiomechTwinPanel latchedBody={latchedBody} locked tall showHud />
          </motion.div>
        )}
      </AnimatePresence>

      {showComposition && latchedBody && (
        <div className="absolute bottom-28 left-0 right-0 z-30 px-4 lg:hidden">
          <BiomechTwinPanel
            latchedBody={latchedBody}
            locked
            tall
            showHud
            className="h-56"
          />
        </div>
      )}

      <div
        className={`absolute bottom-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-4 pb-6 pt-12 ${
          showComposition ? "left-0 right-0 lg:right-[48%]" : "left-0 right-0"
        }`}
      >
        {guideHint && scanning && !analyzing && (
          <div className="mb-2">
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${Math.round(guideProgress * 100)}%` }}
              />
            </div>
            <p
              className={`text-center text-sm font-semibold ${
                poseOk ? "text-emerald-400" : "text-cyan-200"
              }`}
            >
              {scanStatus || guideHint}
            </p>
            {!poseOk && (
              <button
                type="button"
                onClick={() => {
                  requestPoseSkip();
                  setScanStatus("Шаг пропущен");
                }}
                className="mt-2 w-full text-center text-xs text-slate-400 underline"
              >
                Пропустить шаг →
              </button>
            )}
          </div>
        )}

        {analyzing && (
          <p className="mb-3 text-center text-sm text-cyan-300">{scanStatus}</p>
        )}

        {scriptText && scanning && (
          <div className="mb-3 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-3 py-2">
            <p className="text-center text-xs leading-relaxed text-slate-200">
              {scriptText}
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
                onClick={() => {
                  setFocusSportPicker(true);
                  setPhase("dashboard");
                }}
              >
                К выбору тренировки
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
