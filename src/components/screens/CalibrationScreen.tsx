"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import LiveScanGrid from "@/components/visual/LiveScanGrid";
import CoachCameraViewport from "@/components/camera/CoachCameraViewport";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import CameraFacingToggle from "@/components/camera/CameraFacingToggle";
import MobileCameraBanner from "@/components/camera/MobileCameraBanner";
import SilhouetteSetupGate from "@/components/training/SilhouetteSetupGate";
import CalibrationProgress from "@/components/calibration/CalibrationProgress";
import { usePoseTracker } from "@/hooks/usePoseTracker";
import { useCameraDevice } from "@/hooks/useCameraDevice";
import {
  detectMobileCameraCapabilities,
  isMobileDevice,
} from "@/lib/camera/mobileCamera";
import { detectDeviceKind, type CameraFacing } from "@/lib/camera/deviceProfile";
import type { CoachContext } from "@/lib/camera/positionCoach";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import { getCalibrationScript } from "@/lib/calibration/script";
import {
  isPoseGuideStep,
  poseGuideHint,
  waitForLivePose,
  requestPoseSkip,
} from "@/lib/calibration/poseGuide";
import {
  buildBodyScanJson,
  enrichBodyScanJson,
  pushBodyScanSample,
  type BodyScanSample,
} from "@/lib/calibration/bodyScanPayload";
import { analyzeScanFrame } from "@/lib/calibration/scanAnalysis";
import {
  estimateAnthropometrics,
  classifyBodyView,
} from "@/lib/bio/anthropometry";
import { buildBodySignature } from "@/lib/bio/bodySignature";
import { evaluateScanQuality } from "@/lib/bio/scanQuality";
import {
  detectClothingFromLandmarks,
  detectClothingFromScanSummary,
  mergeClothingVerdicts,
} from "@/lib/bio/clothingDetection";
import { estimateStatureFromScan } from "@/lib/bio/statureEstimate";
import {
  captureVideoFrameJpeg,
  listCapturedViews,
  type ScanKeyframes,
} from "@/lib/bio/captureScanFrame";
import { speakScript, speakGuidance, stopSpeaking } from "@/lib/ai/speech";
import { estimateDistanceMeters } from "@/lib/camera/distanceEstimator";
import { estimateHeightFromPose } from "@/lib/camera/heightEstimator";
import { resetDistanceSmoother } from "@/lib/camera/distanceSmoother";
import type { CalibrationStep, LatchedBodyData, NormalizedLandmark } from "@/types";

export default function CalibrationScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const samplesRef = useRef<BodyScanSample[]>([]);
  const keyframesRef = useRef<ScanKeyframes>({});
  const lastFrameAnalysisRef = useRef(
    null as ReturnType<typeof analyzeScanFrame> | null
  );
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
  const [liveClothing, setLiveClothing] = useState("");
  const [scanSampleCount, setScanSampleCount] = useState(0);
  const clothingHitsRef = useRef(0);
  const clothingChecksRef = useRef(0);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>(() =>
    isMobileDevice()
      ? detectMobileCameraCapabilities().scanFacing
      : "user"
  );
  const deviceKind = detectDeviceKind();
  const mobileCaps = detectMobileCameraCapabilities();
  const [setupDone, setSetupDone] = useState(false);
  const scanAutoStartedRef = useRef(false);
  const scanningActiveRef = useRef(false);
  const heightScanFrameRef = useRef(0);

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
  const patchProfileHeight = useAppStore((s) => s.patchProfileHeight);
  const ensureCameraCalibration = useAppStore((s) => s.ensureCameraCalibration);
  const cameraCalibration = useAppStore((s) => s.cameraCalibration);
  const profile = useAppStore((s) => s.profile);
  const selectedSport = useAppStore((s) => s.selectedSport);

  const { cameraStatus, cameraError, canSwitch } = useCameraDevice(
    videoRef,
    true,
    cameraFacing
  );
  const { tick, poseReady, poseError } = usePoseTracker(videoRef, true);

  useEffect(() => {
    resetCalibration();
    ensureCameraCalibration();
    resetDistanceSmoother();
    setSetupDone(false);
    scanAutoStartedRef.current = false;
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

  const tickClothingCheck = useCallback(() => {
    const lm = landmarksRef.current;
    if (!lm || !scanningActiveRef.current) return;
    clothingChecksRef.current += 1;
    const verdict = detectClothingFromLandmarks(lm);
    if (verdict.likely) clothingHitsRef.current += 1;
    if (clothingChecksRef.current % 6 === 0) {
      const ratio = clothingHitsRef.current / clothingChecksRef.current;
      if (ratio > 0.35 || verdict.likely) {
        setLiveClothing(verdict.summary);
      } else if (ratio < 0.15) {
        setLiveClothing("");
      }
    }
  }, []);

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
        if (scanningActiveRef.current) {
          pushBodyScanSample(samplesRef.current, landmarksRef.current, step);
          setScanSampleCount(samplesRef.current.length);
          tickClothingCheck();
        }
      },
      (feedback) => {
        speakGuidance(`cal:pose:${step}`, feedback, { cooldownMs: 12000 });
      }
    );
    setPoseOk(true);
    captureKeyframe(step);
  };

  const sampleForDuration = async (step: CalibrationStep, ms: number) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      pushBodyScanSample(samplesRef.current, landmarksRef.current, step);
      setScanSampleCount(samplesRef.current.length);
      tickClothingCheck();
      captureKeyframe(step);
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  const captureKeyframe = useCallback(
    (step: CalibrationStep) => {
      const video = videoRef.current;
      const lm = landmarksRef.current;
      if (!video || !lm) return;

      const jpeg = captureVideoFrameJpeg(video);
      if (!jpeg) return;

      const view = classifyBodyView(lm);
      if (step === "upper_body" || step === "center" || view === "front") {
        keyframesRef.current.front ??= jpeg;
      }
      if (
        step === "turn_left" ||
        step === "turn_right" ||
        view === "side"
      ) {
        keyframesRef.current.side ??= jpeg;
      } else if (view === "back") {
        keyframesRef.current.back ??= jpeg;
      }

      lastFrameAnalysisRef.current = analyzeScanFrame(lm);
      const views = listCapturedViews(keyframesRef.current);
      if (views.length > 0) {
        setScanStatus(`Захват: ${views.join(", ")}`);
      }
    },
    []
  );

  const runGeminiAnalysis = async (): Promise<LatchedBodyData | null> => {
    const p = profile ?? ensureProfile();
    const cal = cameraCalibration ?? ensureCameraCalibration();
    let scan = buildBodyScanJson(p, samplesRef.current);

    const bestLandmarks = landmarksRef.current;
    const stature = estimateStatureFromScan(bestLandmarks, p.height, cal);
    const heightCm = stature?.heightCm ?? p.height;
    const heightSource =
      stature?.source === "full_body"
        ? "measured"
        : stature
          ? "estimated"
          : "profile";

    if (stature && stature.confidence !== "low") {
      patchProfileHeight(stature.heightCm);
    }

    const anth = estimateAnthropometrics(bestLandmarks, heightCm);
    if (anth && stature) {
      anth.statureCm = stature.heightCm;
    }
    const sig = anth ? buildBodySignature(anth) : null;
    const views = listCapturedViews(keyframesRef.current);
    const frameAnalysis = lastFrameAnalysisRef.current;

    const clothingLive = detectClothingFromLandmarks(bestLandmarks);
    const clothingScan = detectClothingFromScanSummary(samplesRef.current, heightCm);
    const clothingMerged = mergeClothingVerdicts(clothingLive, clothingScan);

    scan = enrichBodyScanJson(scan, {
      anthropometrics: anth,
      bioSignature: sig,
      views,
      keyframeCount: Object.keys(keyframesRef.current).length,
    });

    const scanQuality = evaluateScanQuality(scan, frameAnalysis, views);
    if (clothingMerged.likely && !scanQuality.issues.includes("Одежда мешает точности")) {
      scanQuality.issues.push("Одежда мешает точности");
      scanQuality.clothingPenalty = true;
      scanQuality.score = Math.max(0, scanQuality.score - 10);
      scanQuality.tier =
        scanQuality.score >= 78
          ? "high"
          : scanQuality.score >= 52
            ? "medium"
            : "low";
    }

    setScanStatus(
      `Кадров: ${samplesRef.current.length} · виды: ${views.join(", ") || "нет"} · качество ${scanQuality.score}/100`
    );

    const applyClothingToResult = (
      latched: LatchedBodyData,
      geminiClothing?: boolean
    ): LatchedBodyData => {
      const clothingLikely =
        clothingMerged.likely || geminiClothing || latched.clothingDetected;
      let fatPercent = latched.fatPercent;
      if (clothingLikely && !geminiClothing && latched.source !== "gemini") {
        fatPercent = Math.min(38, fatPercent + 2.5);
      }
      const fatMassKg = (p.weight * fatPercent) / 100;
      return {
        ...latched,
        fatPercent,
        fatMassKg: Math.round(fatMassKg * 10) / 10,
        leanMassKg: Math.round((p.weight - fatMassKg) * 10) / 10,
        totalWeightKg: Math.round(p.weight * 10) / 10,
        heightCm,
        heightSource,
        clothingDetected: clothingLikely,
        clothingReason: clothingMerged.summary,
        clothingConfidence: clothingMerged.confidence,
        scanQuality,
        scanNote: clothingLikely ? clothingMerged.summary : latched.scanNote,
        anthropometrics: anth ?? latched.anthropometrics,
        bioSignature: sig ?? latched.bioSignature,
      };
    };

    try {
      const res = await fetch("/api/gemini/body-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan,
          weight: p.weight,
          keyframes: keyframesRef.current,
          scanQuality,
        }),
      });
      const data = await res.json();
      if (res.ok && data.latched) {
        const merged = applyClothingToResult(
          data.latched as LatchedBodyData,
          Boolean((data.latched as LatchedBodyData).clothingDetected)
        );
        if (data.source !== "gemini") {
          setScanStatus(
            `Локальный расчёт · кадров ${samplesRef.current.length}${
              clothingMerged.likely ? " · одежда обнаружена" : ""
            }`
          );
        }
        return merged;
      }
      const errMsg =
        typeof data?.error === "string"
          ? data.error
          : `HTTP ${res.status}`;
      setScanStatus(`API: ${errMsg} — локальный расчёт`);
    } catch {
      setScanStatus("Сеть недоступна — локальный расчёт");
    }

    const localScan = analyzeScanFrame(bestLandmarks);
    if (clothingMerged.likely) {
      localScan.clothingLikely = true;
      localScan.clothingReason = clothingMerged.summary;
    }
    const local = latchBodyData(localScan);
    return local
      ? applyClothingToResult({
          ...local,
          anthropometrics: anth ?? undefined,
          bioSignature: sig ?? undefined,
          scanQuality,
        })
      : null;
  };

  const runScript = useCallback(async () => {
    if (running) return;
    useAppStore.setState({ bodyDataLocked: false });
    ensureProfile();
    setRunning(true);
    scanningActiveRef.current = true;
    setShowComposition(false);
    setAnalyzing(false);
    setScanStatus("Камера готова");
    samplesRef.current = [];
    keyframesRef.current = {};
    lastFrameAnalysisRef.current = null;
    clothingHitsRef.current = 0;
    clothingChecksRef.current = 0;
    setLiveClothing("");
    setScanSampleCount(0);

    const script = getCalibrationScript(deviceKind);

    for (const line of script) {
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
        await sampleForDuration(
          line.step,
          Math.max(1200, Math.round(line.durationMs * 0.55))
        );
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
    scanningActiveRef.current = false;
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
  const ready = cameraStatus === "ready" && poseReady && !poseError;
  const showSetup = ready && !setupDone && !running && !showComposition;

  const finishSetup = useCallback(() => setSetupDone(true), []);

  useEffect(() => {
    if (!showSetup || !landmarks?.length) return;
    heightScanFrameRef.current += 1;
    if (heightScanFrameRef.current % 24 !== 0) return;
    const baseHeight = profile?.height ?? 182;
    const cal = cameraCalibration ?? ensureCameraCalibration();
    const dist = estimateDistanceMeters(
      landmarks,
      baseHeight,
      "laptop",
      cal,
      true
    )?.meters;
    const est = estimateHeightFromPose(landmarks, dist, cal);
    if (est && est.confidence === "high") {
      patchProfileHeight(est.heightCm);
    }
  }, [
    showSetup,
    landmarks,
    profile?.height,
    patchProfileHeight,
    cameraCalibration,
    ensureCameraCalibration,
  ]);

  useEffect(() => {
    if (!setupDone || running || showComposition || scanAutoStartedRef.current) {
      return;
    }
    scanAutoStartedRef.current = true;
    const t = window.setTimeout(() => {
      void runScript();
    }, 350);
    return () => window.clearTimeout(t);
  }, [setupDone, running, showComposition, runScript]);

  const coachContext: CoachContext | null = scanning
    ? {
        mode: "calibration",
        step: calibrationStep,
        sport: selectedSport ?? undefined,
      }
    : null;

  return (
    <div className="relative min-h-dvh bg-slate-950">
      {!showComposition && (
        <CoachCameraViewport
          videoRef={videoRef}
          landmarks={landmarks}
          mirror={cameraFacing === "user"}
          coachContext={coachContext}
          coachActive={cameraStatus === "ready" && poseReady && scanning}
          voiceCoach={
            scanning &&
            (calibrationStep === "upper_body" ||
              calibrationStep === "arms_up" ||
              calibrationStep === "turn_left" ||
              calibrationStep === "turn_right" ||
              calibrationStep === "center")
          }
          heightCm={profile?.height ?? 182}
          cameraCalibration={cameraCalibration ?? undefined}
        >
          <CameraFacingToggle
            facing={cameraFacing}
            canSwitch={canSwitch}
            onToggle={() =>
              setCameraFacing((f) => (f === "user" ? "environment" : "user"))
            }
          />
          <LiveScanGrid active={scanning} />
          {scanning && (
            <div className="scan-sweep-wrap">
              <div className="scan-sweep" />
            </div>
          )}
        </CoachCameraViewport>
      )}

      {showSetup && (
        <div className="absolute left-3 right-3 top-16 z-25">
          <MobileCameraBanner caps={mobileCaps} />
        </div>
      )}
      {showSetup && (
        <SilhouetteSetupGate
          sport={selectedSport ?? "boxing"}
          landmarksRef={landmarksRef}
          active
          purpose="scan"
          heightCm={profile?.height ?? 182}
          onReady={finishSetup}
          onSkip={finishSetup}
        />
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
            [SCAN] {scanSampleCount} кадров
            {liveMetrics ? ` · ${liveMetrics}` : ""}
            {analyzing ? " · Gemini…" : ""}
          </p>
          {liveClothing && (
            <p className="mt-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-center text-[10px] font-medium text-amber-200">
              ⚠ {liveClothing}
            </p>
          )}
        </div>
      )}

      {showComposition && latchedBody && (
        <div className="absolute bottom-0 left-0 top-0 z-20 flex w-full flex-col justify-center overflow-y-auto bg-slate-950 px-5 py-8 lg:w-[52%]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Gemini · состав тела
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Цифровой двойник</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-600/40 bg-slate-900/80 px-4 py-3">
              <p className="text-[10px] uppercase text-slate-400">Вес</p>
              <p className="text-2xl font-bold text-white">
                {latchedBody.totalWeightKg ?? profile?.weight ?? "—"} кг
              </p>
            </div>
            <div className="rounded-xl border border-slate-600/40 bg-slate-900/80 px-4 py-3">
              <p className="text-[10px] uppercase text-slate-400">Рост</p>
              <p className="text-2xl font-bold text-white">
                {latchedBody.heightCm ?? profile?.height ?? "—"} см
              </p>
              <p className="text-[9px] text-slate-500">
                {latchedBody.heightSource === "measured"
                  ? "измерен по скану"
                  : latchedBody.heightSource === "estimated"
                    ? "оценка по плечам"
                    : "из профиля"}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-[10px] uppercase text-amber-200/80">Жир</p>
              <p className="text-2xl font-bold text-amber-400">
                {latchedBody.fatPercent}%
              </p>
              <p className="text-[10px] text-amber-200/70">
                {latchedBody.fatMassKg} кг
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-[10px] uppercase text-emerald-200/80">Сухая масса</p>
              <p className="text-2xl font-bold text-emerald-400">
                {latchedBody.leanMassKg} кг
              </p>
              <p className="text-[10px] text-emerald-200/70">
                мышцы ~{latchedBody.musclePercent}%
              </p>
            </div>
          </div>

          {(latchedBody.clothingDetected || latchedBody.clothingReason) && (
            <div className="mt-4 rounded-xl border border-amber-500/50 bg-amber-500/15 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase text-amber-300">
                Одежда обнаружена автоматически
              </p>
              <p className="mt-1 text-sm text-amber-100">
                {latchedBody.clothingReason ??
                  "Свободная одежда искажает силуэт — % жира завышен."}
              </p>
              {latchedBody.clothingConfidence != null &&
                latchedBody.clothingConfidence > 0.3 && (
                  <p className="mt-1 text-[10px] text-amber-200/70">
                    Уверенность детектора{" "}
                    {Math.round(latchedBody.clothingConfidence * 100)}%
                  </p>
                )}
            </div>
          )}

          {latchedBody.scanQuality && (
            <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
              <p className="text-[10px] uppercase text-cyan-200/80">
                Качество биоскана · {latchedBody.scanQuality.score}/100
              </p>
              <p className="mt-1 text-sm text-cyan-100">
                {latchedBody.scanQuality.tier === "high"
                  ? "Высокое — мультиракурс и поза приняты"
                  : latchedBody.scanQuality.tier === "medium"
                    ? "Среднее — для точности пересканируйте в облегающей форме"
                    : "Низкое — рекомендуем повторить скан"}
              </p>
              {latchedBody.scanQuality.issues.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-cyan-200/80">
                  {latchedBody.scanQuality.issues.slice(0, 4).map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              {latchedBody.bioSignature && (
                <p className="mt-1 font-mono text-[10px] text-cyan-300/70">
                  Биопрофиль {latchedBody.bioSignature.hash}
                </p>
              )}
            </div>
          )}

          {latchedBody.anthropometrics && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                Рост (скан) {latchedBody.anthropometrics.statureCm} см
              </div>
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                Плечи {latchedBody.anthropometrics.shoulderWidthCm} см
              </div>
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                Бёдра {latchedBody.anthropometrics.hipWidthCm} см
              </div>
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                Талия {latchedBody.anthropometrics.waistWidthCm} см
              </div>
              <div className="rounded-lg bg-slate-900/80 px-3 py-2">
                Размах {latchedBody.anthropometrics.armSpanCm} см
              </div>
            </div>
          )}

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
          {!running && !showComposition && !setupDone && ready && (
            <p className="text-center text-xs text-cyan-300/90">
              Впишитесь в силуэт — биоскан запустится автоматически
            </p>
          )}
          {!running && !showComposition && setupDone && (
            <Button size="lg" onClick={runScript} disabled={running}>
              Запустить биосканирование
            </Button>
          )}
          {showComposition && (
            <>
              <Button size="lg" onClick={() => setPhase("dashboard")}>
                На дашборд
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  scanAutoStartedRef.current = false;
                  setShowComposition(false);
                  setSetupDone(true);
                  void runScript();
                }}
              >
                Пересканировать
              </Button>
              {bodyDataLocked && (
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
              )}
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
