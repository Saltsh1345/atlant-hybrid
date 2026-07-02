import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_MODELS,
  isModelNotFoundError,
} from "@/lib/ai/geminiModels";

const ANALYSIS_DEADLINE_MS = 9500;

export async function generateAnalysis(payload: {
  sport: string;
  exercise?: string;
  durationSec: number;
  avgVelocity: number;
  peakPunchSpeed: number;
  peakVelocity?: number;
  fatigue: number;
  formScore?: number;
  reps?: number;
  punches?: number;
  swings?: number;
  drillFixations?: Array<{
    commandText: string;
    type: string;
    speedMs: number;
    accuracy: number;
    fixed: boolean;
  }>;
}): Promise<{ text: string; source: "gemini" | "fallback"; reason?: string }> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return {
      text: fallbackAnalysis(payload),
      source: "fallback",
      reason: "GEMINI_API_KEY не задан",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const drillBlock =
      payload.drillFixations && payload.drillFixations.length > 0
        ? `\nУдары: ${payload.drillFixations
            .map(
              (f) =>
                `${f.commandText} ${f.speedMs}м/с ${f.accuracy}%${f.fixed ? "" : " (слабо)"}`
            )
            .join("; ")}`
        : "";

    const prompt = `ИИ-тренер Atlant. Русский, кратко.
Итог (1 строка). Слабые места (2 пункта). План на 2 тренировки (4 пункта). Безопасность (1 строка).
${payload.sport}${payload.exercise ? `/${payload.exercise}` : ""} · ${payload.durationSec}с · VBT ${payload.avgVelocity}м/с · техника ${payload.formScore ?? "—"}% · усталость ${payload.fatigue}%
${payload.punches != null ? `удары ${payload.punches}` : ""}${payload.swings != null ? ` замахи ${payload.swings}` : ""}${payload.reps != null ? ` повт ${payload.reps}` : ""}${drillBlock}`;

    const callModel = async (modelName: string): Promise<string> => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 480,
          temperature: 0.6,
        },
      });
      const result = await model.generateContent(prompt);
      return result.response.text()?.trim() ?? "";
    };

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms);
        promise
          .then((v) => {
            clearTimeout(t);
            resolve(v);
          })
          .catch((e) => {
            clearTimeout(t);
            reject(e);
          });
      });

    let text = "";
    const errors: string[] = [];
    const deadline = Date.now() + ANALYSIS_DEADLINE_MS;

    for (const modelName of GEMINI_MODELS) {
      const remaining = deadline - Date.now();
      if (remaining < 1500) {
        errors.push("deadline_exceeded");
        break;
      }

      try {
        text = await withTimeout(callModel(modelName), remaining);
        if (text) break;
        errors.push(`${modelName}: empty_response`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "model_error";
        errors.push(`${modelName}: ${msg}`);
        if (!isModelNotFoundError(msg) && !msg.startsWith("timeout_")) {
          break;
        }
      }
    }

    if (!text.trim()) {
      return {
        text: fallbackAnalysis(payload),
        source: "fallback",
        reason: errors.join(" | ") || "Gemini вернул пустой ответ",
      };
    }
    return { text, source: "gemini" };
  } catch (e) {
    return {
      text: fallbackAnalysis(payload),
      source: "fallback",
      reason: e instanceof Error ? e.message : "Gemini error",
    };
  }
}

function fallbackAnalysis(p: {
  sport: string;
  exercise?: string;
  durationSec: number;
  avgVelocity: number;
  fatigue: number;
  formScore?: number;
  reps?: number;
  punches?: number;
  swings?: number;
}): string {
  const repNote =
    p.reps != null && p.reps > 0 ? ` Выполнено ${p.reps} повторений.` : "";
  const punchNote =
    p.punches != null && p.punches > 0 ? ` Нанесено ${p.punches} ударов.` : "";
  const swingNote =
    p.swings != null && p.swings > 0 ? ` ${p.swings} замахов.` : "";
  const formNote =
    p.formScore != null && p.formScore > 0
      ? ` Техника: ${p.formScore}%.`
      : "";
  const exLabel = p.exercise ? ` (${p.exercise})` : "";
  if (p.fatigue > 60) {
    return `Отличная работа${exLabel}! За ${p.durationSec} секунд вы показали хорошую вовлечённость.${formNote}${repNote}${punchNote}${swingNote} Скорость снизилась — сосредоточьтесь на технике в следующий раз.`;
  }
  return `Превосходная тренировка по ${p.sport}${exLabel}! Средняя скорость ${p.avgVelocity} м/с.${formNote}${repNote}${punchNote}${swingNote} Продолжайте в том же духе.`;
}
