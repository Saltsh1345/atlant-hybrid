import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_MODELS,
  isModelNotFoundError,
} from "@/lib/ai/geminiModels";

const ANALYSIS_DEADLINE_MS = Number(
  process.env.GEMINI_ANALYSIS_TIMEOUT_MS ?? 45000
);

const SYSTEM_INSTRUCTION = `Ты — биомеханик и тренер по технике Atlant-Hybrid (бокс, теннис, силовые).
Твоя задача — разобрать ДВИЖЕНИЕ и ТЕХНИКУ по данным камеры и VBT, а не рассуждать про усталость.

Правила ответа:
- Только русский язык, полные предложения, обычный текст без markdown, без звёздочек, без решёток, без списков с дефисами.
- Не пиши про усталость, восстановление, «вы устали», «снизьте нагрузку из-за fatigue» как главную тему.
- Не здоровайся и не представляйся.
- Опирайся на цифры сессии: скорость, техника %, фиксации drill, пропуски ударов/замахов.
- Говори конкретно: что изменить в стойке, корпусе, руке, ногах, траектории, темпе, амплитуде.
- Дай ближайший план тренировок на 2–3 занятия: что делать, сколько подходов/раундов, на что смотреть в камере, какая целевая скорость или точность.

Структура ответа (абзацы, без заголовков):
1) Краткий биомеханический итог сессии по цифрам (без акцента на усталости).
2) Главные ошибки техники для этого вида спорта и что они значат для результата.
3) Что именно изменить и как тренировать каждое исправление (упражнения, темп, фокус внимания).
4) Ближайший план на 2–3 тренировки для роста показателей (скорость, точность, стабильность техники).`;

function sportLabel(sport: string, exercise?: string): string {
  const names: Record<string, string> = {
    boxing: "бокс",
    tennis: "теннис",
    strength: "силовые",
  };
  const base = names[sport] ?? sport;
  return exercise ? `${base}, упражнение: ${exercise}` : base;
}

function sportBiomechHints(sport: string, exercise?: string): string {
  if (sport === "boxing") {
    return `Биомеханика бокса — разбери именно это:
- стойка и опора на ногах, перенос веса в удар;
- вращение корпуса и плеч, а не только рука;
- выпрямление локтя в конце джеба/кросса, возврат руки;
- траектория хука (локоть не провален, корпус ведёт удар);
- если drill «пропуск» — движение не дошло до порога скорости/амплитуды: что исправить в технике, а не «устали».
Цель: как повысить скорость удара и точность фиксации на камере.`;
  }
  if (sport === "tennis") {
    return `Биомеханика тенниса — разбери именно это:
- подготовка замаха и положение ракетной руки;
- поворот корпуса и оси плеч–таз;
- прогиб/наклон вперёд без «ломания» поясницы;
- момент контакта и доводка замаха;
- если замах не зафиксирован — неполная амплитуда, ранний обрыв, слабое включение корпуса.
Цель: как повысить скорость замаха и стабильность техники.`;
  }
  const ex =
    exercise === "bench"
      ? "жим: траектория локтей, опора лопаток, амплитуда"
      : exercise === "lunge"
        ? "выпад: колено над стопой, вертикаль корпуса, глубина"
        : "присед: глубина, колени, нейтраль поясницы, скорость подъёма VBT";
  return `Биомеханика силовых — разбери: ${ex}. Цель: техника и рабочая скорость повтора.`;
}

type AnalysisPayload = {
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
  readinessScore?: number;
  drillFixations?: Array<{
    commandText: string;
    type: string;
    speedMs: number;
    accuracy: number;
    fixed: boolean;
  }>;
};

function buildPrompt(payload: AnalysisPayload): string {
  const drills = payload.drillFixations ?? [];
  const skipped = drills.filter((f) => !f.fixed || f.speedMs <= 0).length;
  const fixed = drills.filter((f) => f.fixed && f.speedMs > 0);

  const drillBlock =
    drills.length > 0
      ? drills
          .map((f) => {
            if (f.speedMs <= 0 || !f.fixed) {
              return `${f.commandText} (${f.type}): пропуск — движение не зафиксировано`;
            }
            return `${f.commandText} (${f.type}): ${f.speedMs} м/с, техника ${f.accuracy}%`;
          })
          .join("; ")
      : "drill-фиксаций нет";

  const best =
    fixed.length > 0
      ? Math.max(...fixed.map((f) => f.speedMs))
      : payload.peakVelocity ?? payload.peakPunchSpeed;
  const worstFixed =
    fixed.length > 0 ? Math.min(...fixed.map((f) => f.speedMs)) : 0;
  const avgAcc =
    fixed.length > 0
      ? Math.round(
          fixed.reduce((a, f) => a + f.accuracy, 0) / fixed.length
        )
      : payload.formScore ?? 0;

  return `Сделай биомеханический разбор техники и план улучшения показателей.

${sportBiomechHints(payload.sport, payload.exercise)}

Запрещено строить ответ вокруг усталости. Усталость в данных есть только как фон, не как тема.

Данные сессии (используй их как факты биомеханики):
Спорт: ${sportLabel(payload.sport, payload.exercise)}
Длительность: ${payload.durationSec} с
Средняя скорость VBT: ${payload.avgVelocity} м/с
Пик скорости: ${payload.peakVelocity ?? payload.peakPunchSpeed} м/с
Лучший зафиксированный удар/замах: ${best} м/с
Худший из зафиксированных: ${worstFixed || "нет"} м/с
Оценка техники (форма): ${payload.formScore ?? "нет"}%
Readiness (0-100): ${payload.readinessScore ?? "нет"}
Средняя точность drill: ${avgAcc}%
Зафиксировано удачно: ${fixed.length} из ${drills.length || 0}
Пропусков: ${skipped}
${payload.reps != null ? `Повторения: ${payload.reps}` : ""}
${payload.punches != null ? `Удары: ${payload.punches}` : ""}
${payload.swings != null ? `Замахи: ${payload.swings}` : ""}

Drill по командам: ${drillBlock}

Напиши 5–7 абзацев:
что не так в технике по этим цифрам; что человек должен изменить в движении; как именно это тренировать; ближайший план на 2–3 тренировки с объёмом, целевой скоростью/точностью и контролем в камере.`;
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

export async function generateAnalysis(
  payload: AnalysisPayload
): Promise<{ text: string; source: "gemini" | "fallback"; reason?: string }> {
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
          temperature: 0.55,
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
        if (text.length >= 320) break;
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

    if (!text.trim() || text.length < 200) {
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

function fallbackAnalysis(p: AnalysisPayload): string {
  const sport = sportLabel(p.sport, p.exercise);
  const peak = p.peakVelocity ?? p.peakPunchSpeed ?? 0;
  const form = p.formScore ?? 0;
  const drills = p.drillFixations ?? [];
  const skipped = drills.filter((f) => !f.fixed || f.speedMs <= 0).length;
  const fixed = drills.filter((f) => f.fixed && f.speedMs > 0);
  const targetSpeed = Math.max(1.8, peak * 1.08, p.avgVelocity * 1.15);

  let errors = "";
  let fixes = "";
  let plan = "";

  if (p.sport === "boxing") {
    errors =
      skipped > 0
        ? `Камера не зафиксировала ${skipped} из ${drills.length} команд. Для бокса это обычно значит: удар без полного выпрямления руки, слабое вращение корпуса или кисть вышла из кадра до пика скорости.`
        : form > 0 && form < 60
          ? `Техника ${form}% — корпус и рука работают несогласованно, скорость ${p.avgVelocity} м/с нестабильна относительно пика ${peak} м/с.`
          : `Скорость есть (пик ${peak} м/с), но нужно выровнять повторяемость удара от команды к команде.`;
    fixes =
      "Измените три вещи. Первое: перед ударом перенесите вес на переднюю ногу и поверните таз, а не только плечо. Второе: в джебе и кроссе доводите локоть до почти полного выпрямления и сразу возвращайте руку к подбородку. Третье: тренируйте каждый тип удара медленно на 70% скорости, пока камера стабильно фиксирует движение, затем поднимайте темп.";
    plan = `Ближайшие три тренировки. Тренировка 1: 4 раунда по 45 секунд только джеб и кросс, цель не ниже ${targetSpeed.toFixed(1)} м/с на каждом зафиксированном ударе, пауза 40 секунд, смотрите чтобы локоть доходил до конца. Тренировка 2: то же плюс хук, 3 раунда, акцент на поворот корпуса. Тренировка 3: смешанные команды как в drill, 5 раундов, цель — меньше пропусков и техника выше 70%.`;
  } else if (p.sport === "tennis") {
    errors =
      skipped > 0
        ? `Не зафиксировано ${skipped} замахов из ${drills.length}. Обычно замах обрывается рано, корпус не доворачивается или рука не проходит полную дугу.`
        : `Пик ${peak} м/с при средней ${p.avgVelocity} м/с — разброс говорит о нестабильной подготовке к удару.`;
    fixes =
      "Сначала зафиксируйте подготовку: ракетная рука назад, плечи в повороте, вес на задней ноге. Затем ведите замах корпусом, а не только кистью, и завершайте движение через контакт до полной доводки. Тренируйте медленные полные дуги у камеры, пока каждый замах стабильно попадает в фиксацию.";
    plan = `Тренировка 1: 4 блока по 8 замахов форхенд в медленном темпе, цель скорость около ${Math.max(1.6, p.avgVelocity).toFixed(1)} м/с и полная амплитуда. Тренировка 2: бэкхенд и подача по 3 блока, контроль оси плеч–таз. Тренировка 3: смешанный drill, цель — сократить пропуски и поднять пик к ${targetSpeed.toFixed(1)} м/с.`;
  } else {
    errors =
      form > 0 && form < 60
        ? `Техника ${form}% — амплитуда или положение суставов не дотягивают до рабочего паттерна.`
        : `Скорость VBT ${p.avgVelocity} м/с, пик ${peak} м/с — нужно стабилизировать повторы.`;
    fixes =
      "Снизьте темп и отработайте глубину и траекторию без потери контроля. Добавляйте скорость только когда каждый повтор выглядит одинаково в камере.";
    plan = `Тренировка 1: 3 подхода по 8 медленных повторов с контролем техники. Тренировка 2: 4 подхода, цель скорость не ниже ${Math.max(0.5, p.avgVelocity).toFixed(2)} м/с. Тренировка 3: тот же объём, добавьте один подход если техника выше 70%.`;
  }

  return sanitizeAnalysisText(
    `Сессия по ${sport}: средняя скорость ${p.avgVelocity} м/с, пик ${peak} м/с${
      form > 0 ? `, техника ${form}%` : ""
    }${fixed.length ? `, успешных фиксаций ${fixed.length}` : ""}.

${errors}

${fixes}

${plan}`
  );
}
