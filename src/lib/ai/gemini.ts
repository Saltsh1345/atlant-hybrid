import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_MODELS,
  isModelNotFoundError,
} from "@/lib/ai/geminiModels";

const ANALYSIS_DEADLINE_MS = Number(
  process.env.GEMINI_ANALYSIS_TIMEOUT_MS ?? 45000
);

const SYSTEM_INSTRUCTION = `Ты — биомеханик и персональный тренер Atlant-Hybrid.
Отвечай только на русском языке, связным текстом из полных предложений.
Запрещено: markdown, звёздочки, решётки, списки с дефисами или цифрами, заголовки разделов, приветствия вроде «Приветствую» или «Я твой тренер».
Сразу переходи к сути: что не так в технике по данным и как это исправить на следующей тренировке.`;

function sportLabel(sport: string, exercise?: string): string {
  const names: Record<string, string> = {
    boxing: "бокс",
    tennis: "теннис",
    strength: "силовые",
  };
  const base = names[sport] ?? sport;
  return exercise ? `${base}, упражнение: ${exercise}` : base;
}

function buildPrompt(payload: {
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
}): string {
  const drillBlock =
    payload.drillFixations && payload.drillFixations.length > 0
      ? payload.drillFixations
          .map((f) => {
            if (f.speedMs <= 0 || !f.fixed) {
              return `${f.commandText}: не зафиксирован (пропуск)`;
            }
            return `${f.commandText}: ${f.speedMs} м/с, техника ${f.accuracy}%`;
          })
          .join("; ")
      : "drill-команды не выполнялись";

  const skipped =
    payload.drillFixations?.filter((f) => !f.fixed || f.speedMs <= 0).length ??
    0;
  const totalDrills = payload.drillFixations?.length ?? 0;

  return `Разбери тренировку атлета. Напиши 5–7 абзацев обычным текстом (без форматирования).

В тексте обязательно раскрой:
1) Итог сессии по цифрам (длительность, скорость VBT, техника, усталость).
2) Конкретные ошибки техники для этого вида спорта. Если drill помечены как пропуск (${skipped} из ${totalDrills}), объясни что это значит для техники и почему камера могла не увидеть движение (дистанция, угол, неполная амплитуда, темп).
3) Как исправить каждую ошибку: что изменить в положении тела, в замахе, в темпе, в отдыхе между подходами.
4) Подробный план на две следующие тренировки: разминка, основная часть, количество подходов и повторений, целевая скорость, отдых, на что смотреть в камере.
5) Предупреждения по безопасности при усталости ${payload.fatigue}%.

Данные сессии:
Спорт: ${sportLabel(payload.sport, payload.exercise)}
Длительность: ${payload.durationSec} секунд
Средняя скорость VBT: ${payload.avgVelocity} м/с
Пик скорости: ${payload.peakVelocity ?? payload.peakPunchSpeed} м/с
Оценка техники: ${payload.formScore ?? "не оценена"}%
Усталость: ${payload.fatigue}%
${payload.reps != null ? `Повторения: ${payload.reps}` : ""}
${payload.punches != null ? `Зафиксированные удары: ${payload.punches}` : ""}
${payload.swings != null ? `Зафиксированные замахи: ${payload.swings}` : ""}

Drill-фиксации: ${drillBlock}`;
}

/** Strip markdown artifacts the model might still emit. */
export function sanitizeAnalysisText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\s]*[-•*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^[А-ЯA-Z][^\n]{0,40}:\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
    const prompt = buildPrompt(payload);

    const callModel = async (modelName: string): Promise<string> => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.75,
        },
      });
      const result = await model.generateContent(prompt);
      return sanitizeAnalysisText(result.response.text()?.trim() ?? "");
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
      if (remaining < 3000) {
        errors.push("deadline_exceeded");
        break;
      }

      try {
        text = await withTimeout(callModel(modelName), remaining);
        if (text.length >= 280) break;
        if (text) errors.push(`${modelName}: response_too_short`);
        else errors.push(`${modelName}: empty_response`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "model_error";
        errors.push(`${modelName}: ${msg}`);
        if (!isModelNotFoundError(msg) && !msg.startsWith("timeout_")) {
          break;
        }
      }
    }

    if (!text.trim() || text.length < 180) {
      return {
        text: fallbackAnalysis(payload),
        source: "fallback",
        reason: errors.join(" | ") || "Gemini вернул слишком короткий ответ",
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
  peakVelocity?: number;
  peakPunchSpeed?: number;
  drillFixations?: Array<{
    commandText: string;
    speedMs: number;
    accuracy: number;
    fixed: boolean;
  }>;
}): string {
  const sport = sportLabel(p.sport, p.exercise);
  const peak = p.peakVelocity ?? p.peakPunchSpeed ?? 0;
  const form = p.formScore ?? 0;
  const skipped =
    p.drillFixations?.filter((f) => !f.fixed || f.speedMs <= 0).length ?? 0;
  const total = p.drillFixations?.length ?? 0;

  const techniqueNote =
    skipped > 0 && total > 0
      ? `Камера не зафиксировала ${skipped} из ${total} drill-команд. Обычно это значит, что удар или замах был неполным, вы стояли слишком далеко или вышли из кадра. Подойдите ближе, держите корпус и кисти в зоне видимости и выполняйте каждую команду до конца амплитуды.`
      : form > 0 && form < 55
        ? `Техника ${form}% ниже нормы. Снизьте темп и сначала отработайте положение корпуса и стабильность суставов, затем добавляйте скорость.`
        : `Следите за симметрией корпуса и полной амплитудой движения на каждом повторе.`;

  const fatigueNote =
    p.fatigue > 60
      ? `Усталость ${p.fatigue}% высокая. На следующей тренировке сократите объём и увеличьте отдых между подходами до 90–120 секунд.`
      : `Усталость ${p.fatigue}% в допустимых пределах. Можно постепенно повышать интенсивность, но не ценой техники.`;

  return sanitizeAnalysisText(
    `Сессия по ${sport} длилась ${p.durationSec} секунд. Средняя скорость VBT ${p.avgVelocity} м/с, пик ${peak} м/с. ${
      form > 0 ? `Оценка техники ${form}%.` : "Техника по сессии не оценена."
    } ${fatigueNote}

${techniqueNote} ${
      p.avgVelocity < 0.5 && p.sport === "strength"
        ? "Средняя скорость низкая для силовой работы. Проверьте глубину приседа или амплитуду жима, возможно вес слишком большой для текущей формы."
        : "Контролируйте скорость в первых и последних повторениях подхода: падение больше чем на 20% сигнализирует о переутомлении."
    }

На ближайшей тренировке начните с разминки 5–8 минут с мобилизацией плеч, таза и коленей. Основная часть: 3–4 подхода с контролем скорости, цель не ниже ${Math.max(0.5, p.avgVelocity).toFixed(2)} м/с на рабочих повторениях. Между подходами отдыхайте 60–90 секунд и следите, чтобы корпус не «ломался» в конце серии. На второй тренировке повторите тот же объём, но добавьте один подход только если техника останется выше 70%.

${
  p.reps
    ? `Зафиксировано ${p.reps} повторений. Сравните скорость первого и последнего подхода.`
    : ""
} ${
      p.punches
        ? `По ударам в drill зафиксировано ${p.punches} успешных движений.`
        : ""
    } ${
      p.swings
        ? `По замахам зафиксировано ${p.swings} движений.`
        : ""
    } При дискомфорте в суставах прекратите сет и восстановитесь перед продолжением.`
  );
}
