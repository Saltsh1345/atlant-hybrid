import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_MODELS,
  isModelNotFoundError,
} from "@/lib/ai/geminiModels";
import { generateAnalysis, type AnalysisPayload } from "@/lib/ai/gemini";
import type { SessionVideoClip } from "@/lib/training/sessionVideoClips";
import { runYoloActionSignals, type YoloClipSignal } from "@/lib/ai/yoloActions";
import type { Sport } from "@/types";

export interface VideoClipAnalysis {
  clipId: string;
  label: string;
  expectedAction: string;
  actionDetected: string;
  matchesExpected: boolean;
  techniqueScore: number;
  movementQuality: "correct" | "partial" | "incorrect" | "not_visible";
  errors: string[];
  corrections: string[];
  briefSummary: string;
}

export interface SessionVideoAnalysisResult {
  analysis: string;
  source: "gemini" | "fallback";
  reason?: string;
  clipAnalyses: VideoClipAnalysis[];
  yoloSignals: YoloClipSignal[];
}

const CLIP_SYSTEM = `Ты биомеханик Atlant-Hybrid. Смотришь короткое видео с веб-камеры ноутбука (человек тренируется).
Отвечай ТОЛЬКО валидным JSON без markdown:
{
  "actionDetected": string,
  "matchesExpected": boolean,
  "techniqueScore": number,
  "movementQuality": "correct" | "partial" | "incorrect" | "not_visible",
  "errors": string[],
  "corrections": string[],
  "briefSummary": string
}
actionDetected — что РЕАЛЬНО сделано (jab, cross, hook, combo, forehand, backhand, serve, squat, bench, lunge, shadow, warmup, unknown).
matchesExpected — true только если движение соответствует заданию.
errors и corrections — по-русски, коротко, максимум 3 пункта.
briefSummary — 2–3 предложения по-русски.
Не выдумывай то, чего не видно в кадре.`;

function sportClipPrompt(
  sport: Sport,
  clip: SessionVideoClip,
  yoloSignal?: YoloClipSignal
): string {
  const sensor = clip.sensorHint
    ? `Подсказка датчика (может ошибаться): скорость ${clip.sensorHint.speedMs ?? "—"} м/с, техника ${clip.sensorHint.accuracy ?? "—"}%, локоть ${clip.sensorHint.elbowAngle ?? "—"}°.`
    : "";
  const yolo = yoloSignal
    ? `Подсказка YOLO: action=${yoloSignal.action}, confidence=${Math.round(
        yoloSignal.confidence * 100
      )}%, совпадение с заданием=${yoloSignal.matchesExpected ? "да" : "нет"}.`
    : "";

  if (sport === "boxing") {
    return `Вид спорта: бокс.
Задание: «${clip.label}» (ожидаемый тип: ${clip.expectedAction}).
Оцени: какая рука, выпрямление локтя, поворот корпуса/таза, возврат в стойку, попадание в тип удара.
${sensor}
${yolo}`;
  }
  if (sport === "tennis") {
    return `Вид спорта: теннис (без ракетки в кадре — оценивай замах и корпус).
Задание: «${clip.label}» (тип: ${clip.expectedAction}).
Оцени: подготовку, поворот плеч/таза, дугу руки, доводку замаха.
${sensor}
${yolo}`;
  }
  const ex = clip.exercise ?? clip.expectedAction;
  const hints =
    ex === "bench"
      ? "жим: лопатки, траектория локтей, амплитуда, прогиб спины"
      : ex === "lunge"
        ? "выпад: колено над стопой, глубина, вертикаль корпуса"
        : "присед: глубина, колени, нейтральная поясница, скорость фазы";
  return `Вид спорта: силовые.
Упражнение: ${clip.label} (${ex}).
Оцени: ${hints}.
${sensor}
${yolo}`;
}

function parseClipJson(text: string): Omit<VideoClipAnalysis, "clipId" | "label" | "expectedAction"> | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const mq = raw.movementQuality;
    const movementQuality =
      mq === "correct" ||
      mq === "partial" ||
      mq === "incorrect" ||
      mq === "not_visible"
        ? mq
        : "partial";
    return {
      actionDetected: String(raw.actionDetected ?? "unknown"),
      matchesExpected: !!raw.matchesExpected,
      techniqueScore: clamp(Number(raw.techniqueScore) || 0, 0, 100),
      movementQuality,
      errors: arr(raw.errors).slice(0, 3),
      corrections: arr(raw.corrections).slice(0, 3),
      briefSummary: String(raw.briefSummary ?? "").slice(0, 600),
    };
  } catch {
    return null;
  }
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

async function analyzeOneClip(
  genAI: GoogleGenerativeAI,
  sport: Sport,
  clip: SessionVideoClip,
  yoloSignal?: YoloClipSignal
): Promise<VideoClipAnalysis | null> {
  const prompt = sportClipPrompt(sport, clip, yoloSignal);
  const part = {
    inlineData: {
      mimeType: clip.mimeType,
      data: clip.base64,
    },
  };

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: CLIP_SYSTEM,
        generationConfig: {
          maxOutputTokens: 1400,
          temperature: 0.25,
        },
      });
      const res = await model.generateContent([prompt, part]);
      const text = res.response.text()?.trim() ?? "";
      const parsed = parseClipJson(text);
      if (!parsed) continue;
      return {
        clipId: clip.id,
        label: clip.label,
        expectedAction: clip.expectedAction,
        ...parsed,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "err";
      if (!isModelNotFoundError(msg)) break;
    }
  }
  return null;
}

function synthesizeFromClips(
  sport: Sport,
  clipAnalyses: VideoClipAnalysis[],
  payload: AnalysisPayload,
  yoloSignals: YoloClipSignal[]
): string {
  const lines = clipAnalyses.map((c) => {
    const ok = c.matchesExpected ? "совпало" : "не совпало";
    return `• ${c.label}: на видео «${c.actionDetected}» (${ok}), техника ${c.techniqueScore}%. ${c.briefSummary}`;
  });

  const matched = clipAnalyses.filter((c) => c.matchesExpected).length;
  const avgTech = clipAnalyses.length
    ? Math.round(
        clipAnalyses.reduce((s, c) => s + c.techniqueScore, 0) /
          clipAnalyses.length
      )
    : 0;

  const sportName =
    sport === "boxing" ? "бокс" : sport === "tennis" ? "теннис" : "силовые";

  const errors = [
    ...new Set(clipAnalyses.flatMap((c) => c.errors)),
  ].slice(0, 4);
  const fixes = [
    ...new Set(clipAnalyses.flatMap((c) => c.corrections)),
  ].slice(0, 4);
  const yoloMatches = yoloSignals.filter((s) => s.matchesExpected).length;
  const yoloAvg =
    yoloSignals.length > 0
      ? Math.round(
          (yoloSignals.reduce((a, s) => a + s.confidence, 0) /
            yoloSignals.length) *
            100
        )
      : 0;

  return `Видеоанализ ${sportName} (Gemini смотрел ${clipAnalyses.length} клип(ов)). По кадру совпало с заданием ${matched} из ${clipAnalyses.length}, средняя техника ${avgTech}%.

${lines.join("\n\n")}

Главные ошибки по видео: ${errors.length ? errors.join("; ") : "критичных не выделено"}.

Что исправить: ${fixes.length ? fixes.join("; ") : "продолжайте в том же темпе, следите за полной амплитудой в кадре"}.

YOLO проверка: совпадений ${yoloMatches}/${yoloSignals.length || clipAnalyses.length}, средняя уверенность ${yoloAvg}%.

План на 2–3 тренировки: повторяйте каждое задание медленно у камеры, пока тип движения на видео стабильно совпадает с командой; затем поднимайте скорость. Цель — техника выше 75% и совпадение задания в каждом клипе. Сенсор VBT: пик ${payload.peakVelocity ?? payload.peakPunchSpeed} м/с, средняя ${payload.avgVelocity} м/с.`;
}

export async function analyzeSessionWithVideo(
  clips: SessionVideoClip[],
  payload: AnalysisPayload
): Promise<SessionVideoAnalysisResult> {
  const { signals: yoloSignals, reason: yoloReason } = await runYoloActionSignals(
    clips,
    payload.sport as Sport
  );

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    const { text, source, reason } = await generateAnalysis(payload);
    return {
      analysis: text,
      source,
      reason: reason ?? yoloReason,
      clipAnalyses: [],
      yoloSignals,
    };
  }

  if (clips.length === 0) {
    const { text, source, reason } = await generateAnalysis(payload);
    return {
      analysis: text,
      source,
      reason: reason ?? yoloReason ?? "no_video_clips",
      clipAnalyses: [],
      yoloSignals,
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const clipAnalyses: VideoClipAnalysis[] = [];

  for (const clip of clips.slice(0, 4)) {
    const signal = yoloSignals.find((s) => s.clipId === clip.id);
    const result = await analyzeOneClip(
      genAI,
      payload.sport as Sport,
      clip,
      signal
    );
    if (result) clipAnalyses.push(result);
  }

  if (clipAnalyses.length === 0) {
    const { text, source, reason } = await generateAnalysis(payload);
    return {
      analysis: text,
      source,
      reason: reason ?? yoloReason ?? "video_analysis_failed",
      clipAnalyses: [],
      yoloSignals,
    };
  }

  const videoText = synthesizeFromClips(
    payload.sport as Sport,
    clipAnalyses,
    payload,
    yoloSignals
  );

  try {
    const genAI2 = new GoogleGenerativeAI(key);
    const enrichPrompt = `Дополни отчёт тренера. Уже есть разбор по видео:\n${videoText}\n\nДанные сессии: ${JSON.stringify({
      sport: payload.sport,
      exercise: payload.exercise,
      durationSec: payload.durationSec,
      formScore: payload.formScore,
      drillFixations: payload.drillFixations,
    })}\n\nНапиши финальный отчёт по-русски: 4 абзаца, без markdown, без списков с дефисами. 1) итог по видео 2) ошибки 3) что менять 4) план на 2–3 тренировки.`;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI2.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 4096, temperature: 0.45 },
        });
        const res = await model.generateContent(enrichPrompt);
        const text = res.response.text()?.trim() ?? "";
        if (text.length >= 280) {
          return { analysis: text, source: "gemini", clipAnalyses, yoloSignals };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "err";
        if (!isModelNotFoundError(msg)) break;
      }
    }
  } catch {
    /* use videoText */
  }

  return { analysis: videoText, source: "gemini", clipAnalyses, yoloSignals };
}
