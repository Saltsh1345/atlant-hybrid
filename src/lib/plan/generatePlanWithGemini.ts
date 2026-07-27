import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODELS, isModelNotFoundError } from "@/lib/ai/geminiModels";
import { generateWorkoutPlan } from "@/lib/ai/workoutPlan";
import type { ReadinessReport } from "@/lib/readiness";
import type { FitnessGoal } from "@/types";
import {
  EXERCISE_CATALOG,
  exerciseById,
  type ExerciseDef,
} from "@/lib/training/exerciseCatalog";
import { buildIntelligentPlanningContext } from "@/lib/training/program/buildPlanningContext";
import { equipmentAllowedAtLocation } from "@/lib/training/science/rules";
import { constraintProfileFromContext } from "@/lib/training/program/exerciseGuards";
import { applyCorrectiveLayerToPlanExercises } from "@/lib/training/corrective/applyCorrectiveLayer";
import type {
  DailyPlan,
  PlanExercise,
  PlanGenerationContext,
} from "@/lib/plan/types";
import { notRecoveredGroupNames } from "@/lib/plan/readinessToAtlas";

const PLAN_DEADLINE_MS = Number(process.env.GEMINI_ANALYSIS_TIMEOUT_MS ?? 45000);

interface GeminiPlanJson {
  title?: string;
  focus?: string;
  durationMin?: number;
  exercises?: Array<{
    exerciseId?: string;
    sets?: number;
    reps?: number;
    restSec?: number;
  }>;
  tips?: string[];
}

function catalogForPrompt(context: PlanGenerationContext): string {
  const location = context.trainingIntake?.trainingLocation;
  return EXERCISE_CATALOG.filter(
    (e) => !location || equipmentAllowedAtLocation(location, e.equipment),
  )
    .map(
      (e) =>
        `${e.id} — ${e.name} (${e.sport}, ${e.category}, группы: ${e.muscleGroups.join("/")}${e.equipment ? `, инвентарь: ${e.equipment}` : ""})`,
    )
    .join("\n");
}

function buildPrompt(context: PlanGenerationContext, planDate: string): string {
  const notRecovered = notRecoveredGroupNames(context.readinessGroups);
  const sessions = context.recentSessions
    .slice(0, 6)
    .map(
      (s) =>
        `${s.completedAt.slice(0, 10)}: ${s.sport}${s.exercise ? ` (${s.exercise})` : ""}, ${Math.round(s.durationSec / 60)} мин${s.formScore != null ? `, техника ${s.formScore}%` : ""}`,
    )
    .join("\n");

  const intakeBlock = context.trainingIntake
    ? `\n${buildIntelligentPlanningContext(context.trainingIntake, context)}\n`
    : context.bioScan
      ? `\n${context.bioScan.promptBlock}\n`
      : "";

  const constraintBlock = `\n${constraintProfileFromContext(context).promptBlock}\n`;

  return `Составь план тренировки на ${planDate} для пользователя фитнес-приложения.
${intakeBlock}${constraintBlock}
Профиль:
Рост: ${context.heightCm ?? "нет данных"} см
Вес тела: ${context.weightKg ?? "нет данных"} кг
Возраст: ${context.age ?? "нет данных"}
Жир (Health/профиль): ${context.bodyFatPercentage ?? "нет данных"}%
Антропометрия скана: ${context.anthropometrics ? JSON.stringify(context.anthropometrics) : "нет данных"}

Восстановление мышечных групп (0-100):
${context.readinessGroups.map((g) => `${g.name}: ${g.percent}%`).join("\n")}
Невосстановленные группы (НЕ нагружать тяжело): ${notRecovered.length ? notRecovered.join(", ") : "нет"}

Последние тренировки:
${sessions || "истории нет"}

Каталог упражнений (используй ТОЛЬКО эти exerciseId):
${catalogForPrompt(context)}

Правила:
1. 3-5 упражнений, суммарно 25-60 минут.
2. Не давай тяжёлую нагрузку на невосстановленные группы.
3. Учитывай ВСЕ находки биоверификации и ограничения клиента — замены и коррекционные упражнения.
4. Сохраняй силовой характер дня; при ограничениях — безопасные варианты + prehab (кор, ягодицы, ротатор).
5. tips — 2-4 коротких совета на русском.

Ответ строго JSON без markdown:
{"title": "...", "focus": "strength|boxing|tennis", "durationMin": 40, "exercises": [{"exerciseId": "...", "sets": 3, "reps": 10, "restSec": 60}], "tips": ["..."]}`;
}

function toPlanExercise(
  def: ExerciseDef,
  sets: number,
  reps: number,
  restSec: number,
): PlanExercise {
  return {
    exerciseId: def.id,
    name: def.name,
    sets: Math.max(1, Math.min(6, Math.round(sets))),
    reps: Math.max(1, Math.min(30, Math.round(reps))),
    restSec: Math.max(15, Math.min(240, Math.round(restSec))),
    targetMuscles: [...def.primaryMuscles],
    equipment: def.equipment,
    hint: def.hints?.[0],
  };
}

function finalizePlan(
  context: PlanGenerationContext,
  planDate: string,
  source: DailyPlan["source"],
  base: {
    title: string;
    focus: string;
    durationMin: number;
    exercises: PlanExercise[];
    tips: string[];
  },
  reason?: string,
): DailyPlan {
  const intake = context.trainingIntake;
  const location = intake?.trainingLocation ?? "gym";
  const experience = intake?.experienceLevel ?? "intermediate";

  const { exercises, tips: correctionTips } = applyCorrectiveLayerToPlanExercises(
    base.exercises,
    {
      location,
      deload: false,
      experienceLevel: experience,
      constraints: constraintProfileFromContext(context),
      maxCorrectives: 2,
      maxExercises: 6,
    },
  );

  const tips = [...correctionTips, ...base.tips].slice(0, 6);

  return {
    planDate,
    title: base.title,
    focus: base.focus,
    durationMin: Math.max(5, Math.min(180, Math.round(base.durationMin))),
    source,
    exercises,
    tips,
    notRecoveredGroups: notRecoveredGroupNames(context.readinessGroups),
    targetMeshes: Array.from(
      new Set(exercises.flatMap((e) => e.targetMuscles)),
    ),
    reason,
  };
}

function fallbackPlan(
  context: PlanGenerationContext,
  planDate: string,
  reason: string,
): DailyPlan {
  const readiness: ReadinessReport = {
    overall: context.readinessOverall,
    label:
      context.readinessOverall >= 65
        ? "Умеренная готовность"
        : "Восстановление",
    groups: context.readinessGroups,
  };
  const goal: FitnessGoal =
    context.goal === "lose_weight" ||
    context.goal === "gain_muscle" ||
    context.goal === "performance"
      ? context.goal
      : "maintain";
  const lastSession = context.recentSessions[0] ?? null;

  const local = generateWorkoutPlan({
    goal,
    readiness,
    lastSport:
      lastSession &&
      (lastSession.sport === "strength" ||
        lastSession.sport === "boxing" ||
        lastSession.sport === "tennis")
        ? lastSession.sport
        : null,
    lastExercise:
      lastSession?.exercise === "squat" ||
      lastSession?.exercise === "bench" ||
      lastSession?.exercise === "lunge"
        ? lastSession.exercise
        : null,
  });

  const exercises = (local.exerciseIds ?? [])
    .map((id) => exerciseById(id))
    .filter((def): def is ExerciseDef => Boolean(def))
    .map((def) =>
      toPlanExercise(
        def,
        def.defaultSets.length,
        def.defaultSets[0]?.reps ?? 10,
        def.defaultSets[0]?.restSec ?? 60,
      ),
    );

  return finalizePlan(
    context,
    planDate,
    "fallback",
    {
      title: local.title,
      focus: local.focus,
      durationMin: local.durationMin,
      exercises,
      tips: local.tips,
    },
    reason,
  );
}

function parseGeminiPlan(
  raw: string,
  context: PlanGenerationContext,
  planDate: string,
): DailyPlan | null {
  let json: GeminiPlanJson;
  try {
    json = JSON.parse(raw.replace(/```json|```/g, "").trim()) as GeminiPlanJson;
  } catch {
    return null;
  }

  const exercises = (json.exercises ?? [])
    .map((item) => {
      const def = item.exerciseId ? exerciseById(item.exerciseId) : undefined;
      if (!def) return null;
      return toPlanExercise(
        def,
        item.sets ?? def.defaultSets.length,
        item.reps ?? def.defaultSets[0]?.reps ?? 10,
        item.restSec ?? def.defaultSets[0]?.restSec ?? 60,
      );
    })
    .filter((e): e is PlanExercise => e !== null);

  if (exercises.length === 0) return null;

  return finalizePlan(context, planDate, "gemini", {
    title: json.title?.trim() || "План на сегодня",
    focus:
      json.focus === "strength" ||
      json.focus === "boxing" ||
      json.focus === "tennis"
        ? json.focus
        : "strength",
    durationMin: Number.isFinite(json.durationMin) ? Number(json.durationMin) : 40,
    exercises,
    tips: (json.tips ?? []).filter((t) => typeof t === "string" && t.trim()),
  });
}

export async function generateDailyPlan(
  context: PlanGenerationContext,
  planDate: string,
): Promise<DailyPlan> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return fallbackPlan(context, planDate, "GEMINI_API_KEY не задан");
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const prompt = buildPrompt(context, planDate);
    const deadline = Date.now() + PLAN_DEADLINE_MS;
    const errors: string[] = [];

    for (const modelName of GEMINI_MODELS) {
      const remaining = deadline - Date.now();
      if (remaining < 3000) {
        errors.push("deadline_exceeded");
        break;
      }

      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        });
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`timeout_${remaining}ms`)), remaining),
          ),
        ]);
        const text = result.response.text()?.trim() ?? "";
        const plan = parseGeminiPlan(text, context, planDate);
        if (plan) return plan;
        errors.push(`${modelName}: invalid_plan_json`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "model_error";
        errors.push(`${modelName}: ${msg}`);
        if (!isModelNotFoundError(msg) && !msg.startsWith("timeout_")) {
          break;
        }
      }
    }

    return fallbackPlan(
      context,
      planDate,
      errors.join(" | ") || "Gemini не вернул валидный план",
    );
  } catch (e) {
    return fallbackPlan(
      context,
      planDate,
      e instanceof Error ? e.message : "Gemini error",
    );
  }
}
