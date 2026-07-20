"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@/types";
import CameraStatusOverlay from "@/components/camera/CameraStatusOverlay";
import PoseOverlay from "@/components/camera/PoseOverlay";
import SilhouetteGuide from "@/components/camera/SilhouetteGuide";
import { useCameraDevice } from "@/hooks/useCameraDevice";
import { usePoseTracker } from "@/hooks/usePoseTracker";
import { analyzePoseLive } from "@/lib/calibration/poseAnalysis";
import { fullBodyProgress } from "@/lib/calibration/scanAnalysis";
import { buildStageTwoScanResult } from "@/lib/scan/scanResult";
import {
  loadStatureFromProfile,
  persistBodyScan,
  saveStatureToProfile,
} from "@/lib/scan/persistScan";
import { StablePoseGate } from "@/lib/scan/stablePoseGate";
import { useScanStore } from "@/store/scanStore";
import { useUserHealthStore } from "@/store/userHealthStore";

interface LiveGuide {
  progress: number;
  accepted: boolean;
  feedback: string;
  holdProgress: number;
}

const EMPTY_GUIDE: LiveGuide = {
  progress: 0,
  accepted: false,
  feedback: "Встаньте в кадр",
  holdProgress: 0,
};

function speak(text: string) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !text
  ) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function ScanFlow() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const frontLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const sideLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const gateRef = useRef(new StablePoseGate(12));
  const capturePendingRef = useRef(false);
  const [heightInput, setHeightInput] = useState("");
  const [checkingSavedHeight, setCheckingSavedHeight] = useState(true);
  const [guide, setGuide] = useState<LiveGuide>(EMPTY_GUIDE);

  const phase = useScanStore((state) => state.phase);
  const statureCm = useScanStore((state) => state.statureCm);
  const result = useScanStore((state) => state.result);
  const error = useScanStore((state) => state.error);
  const saving = useScanStore((state) => state.saving);
  const setPhase = useScanStore((state) => state.setPhase);
  const setStatureCm = useScanStore((state) => state.setStatureCm);
  const setResult = useScanStore((state) => state.setResult);
  const setSaving = useScanStore((state) => state.setSaving);
  const setError = useScanStore((state) => state.setError);
  const reset = useScanStore((state) => state.reset);
  const setHealthProfile = useUserHealthStore((state) => state.setProfile);

  const cameraActive =
    phase === "front" || phase === "side" || phase === "processing";
  const { cameraStatus, cameraError } = useCameraDevice(
    videoRef,
    cameraActive,
    "user",
  );
  const { tick, poseReady, poseError } = usePoseTracker(
    videoRef,
    cameraActive,
  );

  useEffect(() => {
    let active = true;

    void loadStatureFromProfile()
      .then((savedStatureCm) => {
        if (!active || savedStatureCm === null) return;
        setHeightInput(savedStatureCm.toString());
        setHealthProfile({ heightCm: savedStatureCm });
        setStatureCm(savedStatureCm);
        setPhase("front");
      })
      .catch(() => {
        // The height form keeps its existing authentication error on submit.
      })
      .finally(() => {
        if (active) setCheckingSavedHeight(false);
      });

    return () => {
      active = false;
    };
  }, [setHealthProfile, setPhase, setStatureCm]);

  const finishScan = useCallback(
    async (
      frontLandmarks: NormalizedLandmark[],
      sideLandmarks: NormalizedLandmark[],
    ) => {
      const video = videoRef.current;
      if (!video || !statureCm) {
        setError("Не удалось получить размер кадра или рост пользователя.");
        return;
      }

      setPhase("processing");
      setSaving(true);

      try {
        const scanResult = buildStageTwoScanResult({
          frontLandmarks,
          sideLandmarks,
          statureCm,
          frame: {
            width: video.videoWidth,
            height: video.videoHeight,
          },
        });

        await persistBodyScan(scanResult);
        setResult(scanResult);
        speak("Сканирование завершено");
      } catch (scanError) {
        const message =
          scanError instanceof Error &&
          scanError.message === "authentication_required"
            ? "Нужно войти через Google на главной странице."
            : "Не удалось сохранить скан. Проверьте миграцию Supabase.";
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [setError, setPhase, setResult, setSaving, statureCm],
  );

  const captureStablePose = useCallback(
    async (landmarks: NormalizedLandmark[]) => {
      if (capturePendingRef.current) return;
      capturePendingRef.current = true;

      const snapshot = landmarks.map((landmark) => ({ ...landmark }));

      if (phase === "front") {
        frontLandmarksRef.current = snapshot;
        gateRef.current.reset();
        setGuide(EMPTY_GUIDE);
        setPhase("side");
        speak("Фронтальный вид сохранен. Повернитесь боком.");
        return;
      }

      if (phase === "side" && frontLandmarksRef.current) {
        sideLandmarksRef.current = snapshot;
        await finishScan(frontLandmarksRef.current, snapshot);
      }

      capturePendingRef.current = false;
    },
    [finishScan, phase, setPhase],
  );

  useEffect(() => {
    if (phase !== "front" && phase !== "side") return;

    let animationFrame = 0;
    let active = true;
    let lastEvaluationAt = 0;

    const loop = (timestamp: number) => {
      if (!active) return;

      const landmarks = tick();
      landmarksRef.current = landmarks;

      if (timestamp - lastEvaluationAt >= 120) {
        lastEvaluationAt = timestamp;
        const calibrationStep = phase === "front" ? "center" : "profile_turn";
        const live = analyzePoseLive(calibrationStep, landmarks);
        const fullBody = fullBodyProgress(landmarks);
        const accepted = live.accepted && fullBody.ok;
        const hold = gateRef.current.update(accepted);

        setGuide({
          progress: Math.min(live.progress, fullBody.score),
          accepted,
          feedback: accepted
            ? "Держите позу неподвижно"
            : live.accepted
              ? fullBody.reason
              : live.feedback,
          holdProgress: hold.progress,
        });

        if (hold.complete && landmarks) {
          void captureStablePose(landmarks);
        }
      }

      animationFrame = window.requestAnimationFrame(loop);
    };

    animationFrame = window.requestAnimationFrame(loop);

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [captureStablePose, phase, tick]);

  useEffect(() => {
    if (phase === "front") {
      capturePendingRef.current = false;
      window.setTimeout(
        () => speak("Встаньте в рамку лицом к камере"),
        0,
      );
    }
    if (phase === "side") {
      capturePendingRef.current = false;
      window.setTimeout(() => speak("Повернитесь боком"), 0);
    }
  }, [phase]);

  const startScan = async () => {
    const parsedHeight = Number(heightInput.replace(",", "."));

    if (!Number.isFinite(parsedHeight) || parsedHeight < 140 || parsedHeight > 220) {
      setError("Введите рост от 140 до 220 сантиметров.");
      return;
    }

    setSaving(true);
    try {
      await saveStatureToProfile(parsedHeight);
      setHealthProfile({ heightCm: parsedHeight });
      setStatureCm(parsedHeight);
      frontLandmarksRef.current = null;
      sideLandmarksRef.current = null;
      gateRef.current.reset();
      setGuide(EMPTY_GUIDE);
      setPhase("front");
    } catch {
      setError("Не удалось сохранить рост. Сначала войдите через Google.");
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    window.speechSynthesis?.cancel();
    frontLandmarksRef.current = null;
    sideLandmarksRef.current = null;
    landmarksRef.current = null;
    gateRef.current.reset();
    capturePendingRef.current = false;
    setGuide(EMPTY_GUIDE);
    setHeightInput(statureCm?.toString() ?? "");
    reset();
    if (statureCm) {
      setStatureCm(statureCm);
      setPhase("front");
    }
  };

  if (phase === "height") {
    return (
      <main className="min-h-dvh bg-black px-5 py-8 text-white">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col justify-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-300/60">
            ATLANT://BIO-SCAN/PREFLIGHT
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Калибровка масштаба</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Рост нужен для перевода размеров тела из пикселей в сантиметры и
            сохраняется в защищённом профиле при первой верификации.
          </p>

          {checkingSavedHeight ? (
            <p className="mt-8 text-sm text-cyan-200">
              Проверяем сохранённый рост...
            </p>
          ) : (
            <label className="mt-8 text-xs font-medium tracking-wide text-zinc-400">
              РОСТ, СМ
              <input
                value={heightInput}
                onChange={(event) => setHeightInput(event.target.value)}
                inputMode="decimal"
                placeholder="Например, 178"
                className="mt-2 w-full rounded-2xl border border-cyan-300/25 bg-zinc-950 px-4 py-4 text-lg text-white outline-none transition focus:border-cyan-300"
              />
            </label>
          )}

          {error ? (
            <p className="mt-3 text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void startScan()}
            disabled={saving || checkingSavedHeight}
            className="mt-6 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-bold tracking-wide text-black disabled:opacity-50"
          >
            {checkingSavedHeight
              ? "ПРОВЕРКА ПРОФИЛЯ..."
              : saving
                ? "СОХРАНЕНИЕ..."
                : "ВКЛЮЧИТЬ КАМЕРУ"}
          </button>
          <Link
            href="/"
            className="mt-4 text-center text-xs text-zinc-500 hover:text-zinc-300"
          >
            Вернуться на главную
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "complete" && result) {
    return (
      <main className="min-h-dvh bg-black px-5 py-8 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-[10px] tracking-[0.3em] text-emerald-300/70">
            SCAN COMPLETE
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Био-скан сохранён</h1>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric label="Качество" value={`${result.quality.score}%`} />
            <Metric
              label="Профиль"
              value={result.posture?.confidence ?? "нет данных"}
            />
            <Metric
              label="Предплечье"
              value={
                result.segments
                  ? `${result.segments.forearm.centimeters} см`
                  : "—"
              }
            />
            <Metric
              label="Бедро"
              value={
                result.segments
                  ? `${result.segments.thigh.centimeters} см`
                  : "—"
              }
            />
          </div>

          <div
            className={`mt-4 rounded-2xl border p-4 ${
              result.hyperlordosisLikely
                ? "border-amber-300/30 bg-amber-300/10"
                : "border-emerald-300/25 bg-emerald-300/10"
            }`}
          >
            <p className="text-sm font-medium">
              {result.hyperlordosisLikely
                ? "Есть оценочный признак отклонения таза"
                : "Выраженный признак отклонения таза не выявлен"}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              {result.posture?.note ??
                "Недостаточно данных для профильной оценки."}
            </p>
          </div>

          {result.quality.issues.length > 0 ? (
            <ul className="mt-4 space-y-1 text-xs text-zinc-500">
              {result.quality.issues.map((issue) => (
                <li key={issue}>— {issue}</li>
              ))}
            </ul>
          ) : null}

          <p className="mt-6 text-xs leading-5 text-zinc-600">
            Результат является компьютерной оценкой по 2D-камере и не является
            медицинским диагнозом.
          </p>

          <button
            type="button"
            onClick={restart}
            className="mt-6 w-full rounded-2xl border border-cyan-300/30 px-5 py-4 text-sm font-semibold text-cyan-200"
          >
            ПОВТОРИТЬ СКАНИРОВАНИЕ
          </button>
          <button
            type="button"
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-2xl border border-white/10 px-5 py-4 text-sm font-semibold text-zinc-600"
            title="Раздел будет доступен после Этапа 3"
          >
            К ПЛАНУ · СКОРО
          </button>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="grid min-h-dvh place-items-center bg-black px-5 text-white">
        <div className="w-full max-w-md text-center">
          <p className="text-xl font-semibold">Сканирование остановлено</p>
          <p className="mt-3 text-sm text-rose-300">{error}</p>
          <button
            type="button"
            onClick={restart}
            className="mt-6 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-black"
          >
            НАЧАТЬ ЗАНОВО
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
        playsInline
        muted
      />

      <PoseOverlay
        landmarksRef={landmarksRef}
        mirrored
        mode="calibration"
      />
      <SilhouetteGuide
        sport="strength"
        progress={guide.progress}
        fit={guide.accepted}
        visible={phase === "front" || phase === "side"}
      />
      <CameraStatusOverlay
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        poseReady={poseReady}
        poseError={poseError}
      />

      <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/90 to-transparent px-5 pb-12 pt-5">
        <div className="mx-auto max-w-xl">
          <p className="font-mono text-[9px] tracking-[0.3em] text-cyan-300/70">
            {phase === "front" ? "VIEW 01 / FRONT" : "VIEW 02 / SIDE"}
          </p>
          <h1 className="mt-2 text-xl font-semibold">
            {phase === "front"
              ? "Встаньте лицом в рамку"
              : "Повернитесь боком"}
          </h1>
          <p className="mt-1 text-sm text-zinc-300">{guide.feedback}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 transition-[width] duration-150"
              style={{ width: `${guide.holdProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {phase === "processing" ? (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
            <p className="mt-4 font-mono text-xs tracking-wider text-cyan-200">
              АНАЛИЗ И СОХРАНЕНИЕ...
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="font-mono text-[9px] tracking-wider text-zinc-600">
        {label.toUpperCase()}
      </p>
      <p className="mt-2 text-lg font-medium text-cyan-100">{value}</p>
    </div>
  );
}
