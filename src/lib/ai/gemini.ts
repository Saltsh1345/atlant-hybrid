import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_MODELS,
  isModelNotFoundError,
} from "@/lib/ai/geminiModels";

const ANALYSIS_DEADLINE_MS = Number(
  process.env.GEMINI_ANALYSIS_TIMEOUT_MS ?? 28000
);

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
          .map(
            (f) =>
              `- ${f.commandText} (${f.type}): ${f.speedMs} м/с, техника ${f.accuracy}%${f.fixed ? "" : ", слабая фиксация"}`
          )
          .join("\n")
      : "нет drill-фиксаций";

  return `Ты — биомеханик и персональный тренер приложения Atlant-Hybrid.
Напиши ПОЛНЫЙ разбор тренировки на русском. Обязательно выдай ВСЕ 4 раздела ниже — не сокращай до одного предложения.

## Итог сессии
2–3 предложения: общая оценка, что получилось хорошо, где просадка по данным.

## Слабые места
- минимум 2 пункта с конкретикой (скорость VBT, углы, усталость, техника)
- каждый пункт — отдельная строка с «-»

## План на 2 тренировки
- минимум 4 рекомендации: упражнения, темп, объём, фокус внимания
- каждая рекомендация — отдельная строка с «-»

## Безопасность
1–2 предложения: риски по усталости ${payload.fatigue}%, технике ${payload.formScore ?? "—"}%, что снизить/избегать.

Данные сессии:
- Спорт: ${payload.sport}${payload.exercise ? ` · упражнение: ${payload.exercise}` : ""}
- Длительность: ${payload.durationSec} с
- Средняя скорость VBT: ${payload.avgVelocity} м/с
- Пик скорости: ${payload.peakVelocity ?? payload.peakPunchSpeed} м/с
- Техника (форма): ${payload.formScore ?? "—"}%
- Усталость: ${payload.fatigue}%
${payload.reps != null ? `- Повторения: ${payload.reps}` : ""}
${payload.punches != null ? `- Удары (фиксации): ${payload.punches}` : ""}
${payload.swings != null ? `- Замахи (фиксации): ${payload.swings}` : ""}

Drill-фиксации:
${drillBlock}`;
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
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.65,
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
      if (remaining < 2000) {
        errors.push("deadline_exceeded");
        break;
      }

      try {
        text = await withTimeout(callModel(modelName), remaining);
        if (text.length >= 120) break;
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

    if (!text.trim() || text.length < 80) {
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
  const exLabel = p.exercise ? ` (${p.exercise})` : "";
  const peak = p.peakVelocity ?? p.peakPunchSpeed ?? 0;
  const form = p.formScore ?? 0;

  const weak1 =
    p.fatigue > 55
      ? "Скорость упала к концу — признак усталости, снизьте интенсивность в финале подхода."
      : form > 0 && form < 55
        ? "Техника ниже 55% — уделите внимание амплитуде и стабильности корпуса."
        : "Контролируйте темп в эксцентрической фазе для стабильного VBT.";

  const weak2 =
    p.avgVelocity < 0.5 && p.sport === "strength"
      ? "Средняя скорость VBT низкая — проверьте вес и глубину/амплитуду."
      : "Следите за симметрией и положением корпуса на каждом повторе/ударе.";

  return `## Итог сессии
Тренировка по ${p.sport}${exLabel} длилась ${p.durationSec} с. Средняя скорость ${p.avgVelocity} м/с, пик ${peak} м/с. Техника ${form > 0 ? `${form}%` : "не оценена"}, усталость ${p.fatigue}%.

## Слабые места
- ${weak1}
- ${weak2}
${p.reps ? `- Зафиксировано ${p.reps} повторений — отслеживайте стабильность скорости между подходами.` : ""}
${p.punches ? `- Ударов в drill: ${p.punches} — сравните скорость первых и последних.` : ""}
${p.swings ? `- Замахов в drill: ${p.swings} — проверьте баланс оси на последних ударах.` : ""}

## План на 2 тренировки
- Разминка 5–8 мин с акцентом на подвижность суставов
- Основная работа: 3–4 подхода с контролем скорости (цель VBT ≥ ${Math.max(0.5, p.avgVelocity).toFixed(2)} м/с)
- Между подходами отдых 60–90 с, не допускайте падения скорости >20%
- Завершите сессию упражнением на стабилизацию корпуса 2×12

## Безопасность
При усталости ${p.fatigue}%${p.fatigue > 60 ? " сократите объём и избегайте максимальных весов" : " поддерживайте технику в приоритете над скоростью"}. При дискомфорте в суставах — остановитесь и восстановитесь.`;
}
