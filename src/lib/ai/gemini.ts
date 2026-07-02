import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const key = process.env.GEMINI_API_KEY;
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
        ? `\nФиксации по командам:\n${payload.drillFixations
            .map(
              (f) =>
                `- ${f.commandText} (${f.type}): скорость ${f.speedMs} м/с, точность ${f.accuracy}%, ${f.fixed ? "зачтено" : "не зачтено"}`
            )
            .join("\n")}`
        : "";

    const prompt = `Ты ИИ-тренер Atlant-Hybrid.
Нужен практичный вывод тренировки на русском, без воды.
Формат ответа:
1) "Итог" — 1 короткая строка
2) "Слабые места" — 2-3 пункта (мышцы и движения, где точность/скорость просели)
3) "План на 2 ближайшие тренировки" — 4-6 пунктов с конкретикой (подходы/время/темп/техника), фокус на отстающие мышцы и паттерны движения
4) "Фокус безопасности" — 1 строка
Опирайся на эти данные и учитывай специфику спорта (бокс != теннис).
${drillBlock ? "При анализе ударов/замахов сравни скорость и точность по каждой команде." : ""}

Спорт: ${payload.sport}
${payload.exercise ? `Упражнение: ${payload.exercise}` : ""}
Длительность: ${payload.durationSec} сек
Средняя скорость VBT: ${payload.avgVelocity} м/с
Пик скорости: ${payload.peakVelocity ?? payload.avgVelocity} м/с
Оценка техники: ${payload.formScore ?? "—"}%
Пик удара: ${payload.peakPunchSpeed} м/с
Усталость: ${payload.fatigue}%
${payload.reps != null ? `Повторы: ${payload.reps}` : ""}
${payload.punches != null ? `Удары: ${payload.punches}` : ""}
${payload.swings != null ? `Замахи: ${payload.swings}` : ""}${drillBlock}
Тон: профессиональный и конкретный, без медицинских диагнозов.`;

    const preferred = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ];
    let text = "";
    const errors: string[] = [];
    for (const modelName of preferred) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        text = result.response.text() || "";
        if (text.trim()) break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "model_error";
        errors.push(`${modelName}: ${msg}`);
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
