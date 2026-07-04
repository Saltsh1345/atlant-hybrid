import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_MODELS,
  isModelNotFoundError,
} from "@/lib/ai/geminiModels";
import type { BodyScanJson } from "@/lib/calibration/bodyScanPayload";
import type { FatZoneMap, LatchedBodyData, PostureReport } from "@/types";

export interface BodyScanGeminiResult {
  fatPercent: number;
  musclePercent: number;
  fatZones: FatZoneMap;
  posture: PostureReport;
  report: string;
  clothingLikely: boolean;
}

const SYSTEM = `Ты биомеханик Atlant-Hybrid. Анализируешь JSON скана с ноутбучной веб-камеры.
Ответь ТОЛЬКО валидным JSON без markdown и без текста вокруг.
Схема:
{
  "fatPercent": number,
  "musclePercent": number,
  "fatZones": {
    "abdomen": 0-1,
    "chest": 0-1,
    "back": 0-1,
    "hips": 0-1,
    "thighs": 0-1,
    "arms": 0-1
  },
  "posture": {
    "spine": "кратко",
    "shoulders": "кратко",
    "hips": "кратко",
    "alignment": "кратко"
  },
  "report": "2-4 предложения на русском: осанка, позвоночник, смещение, состав тела",
  "clothingLikely": boolean
}
fatZones — где рисовать жир на двойнике (не цифры на теле). arms почти всегда 0–0.25, жир на руках не преувеличивай.
Учитывай: камера ноутбука, верх тела ближе, низ — после отхода.`;

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

function defaultZones(fatPercent: number): FatZoneMap {
  const t = clamp01((fatPercent - 10) / 28);
  return {
    abdomen: clamp01(0.35 + t * 0.55),
    chest: clamp01(0.15 + t * 0.25),
    back: clamp01(0.12 + t * 0.2),
    hips: clamp01(0.2 + t * 0.35),
    thighs: clamp01(0.1 + t * 0.25),
    arms: clamp01(0.05 + t * 0.1),
  };
}

function localFallback(payload: BodyScanJson): BodyScanGeminiResult {
  const bmi =
    payload.profile.weight /
    Math.pow(payload.profile.height / 100, 2);
  let fatPercent = 12 + (bmi - 22) * 1.8;
  fatPercent = clamp(fatPercent, 10, 36);
  const musclePercent = clamp(100 - fatPercent - 18, 34, 58);
  const asym =
    payload.summary.avgShoulderAsymmetry + payload.summary.avgHipAsymmetry;
  const lean = Math.abs(payload.summary.avgTorsoLean);

  return {
    fatPercent: Math.round(fatPercent * 10) / 10,
    musclePercent: Math.round(musclePercent * 10) / 10,
    fatZones: defaultZones(fatPercent),
    posture: {
      spine:
        lean > 0.04
          ? "Лёгкий наклон корпуса в сторону"
          : "Ось корпуса в пределах нормы",
      shoulders:
        payload.summary.avgShoulderAsymmetry > 0.03
          ? "Небольшая асимметрия плеч"
          : "Плечи относительно ровные",
      hips:
        payload.summary.avgHipAsymmetry > 0.03
          ? "Таз слегка смещён"
          : "Таз стабилен",
      alignment:
        asym > 0.05
          ? "Есть признаки асимметрии — следите за осанкой"
          : "Смещение костей не выражено",
    },
    report: `По скану с ноутбучной камеры ориентировочный жир ${fatPercent.toFixed(1)}%, мышцы ${musclePercent.toFixed(1)}%. ${
      lean > 0.04
        ? "Заметен лёгкий наклон корпуса."
        : "Осанка в целом ровная."
    } Жир на двойнике показан в зонах живота и бёдер, без преувеличения на руках.`,
    clothingLikely: payload.summary.upperVisibility < 0.55,
  };
}

function parseJson(text: string): BodyScanGeminiResult | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(cleaned.slice(start, end + 1)) as Partial<BodyScanGeminiResult>;
    const fatPercent = clamp(Number(raw.fatPercent) || 20, 8, 40);
    const musclePercent = clamp(Number(raw.musclePercent) || 42, 30, 62);
    const z = raw.fatZones ?? defaultZones(fatPercent);
    return {
      fatPercent: Math.round(fatPercent * 10) / 10,
      musclePercent: Math.round(musclePercent * 10) / 10,
      fatZones: {
        abdomen: clamp01(Number(z.abdomen) || 0.4),
        chest: clamp01(Number(z.chest) || 0.2),
        back: clamp01(Number(z.back) || 0.15),
        hips: clamp01(Number(z.hips) || 0.3),
        thighs: clamp01(Number(z.thighs) || 0.2),
        arms: clamp01(Math.min(0.35, Number(z.arms) || 0.08)),
      },
      posture: {
        spine: String(raw.posture?.spine ?? "Осанка в пределах нормы"),
        shoulders: String(raw.posture?.shoulders ?? "Плечи стабильны"),
        hips: String(raw.posture?.hips ?? "Таз стабилен"),
        alignment: String(raw.posture?.alignment ?? "Смещений не выявлено"),
      },
      report: String(raw.report ?? "").trim() || localFallback({
        version: 1,
        capturedAt: "",
        profile: { height: 175, weight: 75, age: 28, goal: "maintain" },
        camera: "laptop_webcam",
        phases: [],
        samples: [],
        summary: {
          sampleCount: 0,
          avgShoulderWidth: 0,
          avgTorsoLean: 0,
          avgSpineFlexion: 0,
          avgShoulderAsymmetry: 0,
          avgHipAsymmetry: 0,
          minKneeAngle: 180,
          armsRaisedRatio: 0,
          upperVisibility: 1,
          lowerVisibility: 1,
        },
      }).report,
      clothingLikely: Boolean(raw.clothingLikely),
    };
  } catch {
    return null;
  }
}

export async function analyzeBodyScan(
  payload: BodyScanJson
): Promise<{ result: BodyScanGeminiResult; source: "gemini" | "local"; reason?: string }> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return { result: localFallback(payload), source: "local", reason: "no_key" };
  }

  const prompt = `Проанализируй скан тела (JSON). Камера ноутбука, сначала верх, потом поворот 360 с руками вверх, затем отход и присед.\n\n${JSON.stringify(payload)}`;

  const genAI = new GoogleGenerativeAI(key);
  const errors: string[] = [];

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM,
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.35,
        },
      });
      const res = await model.generateContent(prompt);
      const text = res.response.text()?.trim() ?? "";
      const parsed = parseJson(text);
      if (parsed) return { result: parsed, source: "gemini" };
      errors.push(`${modelName}: bad_json`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "err";
      errors.push(`${modelName}: ${msg}`);
      if (!isModelNotFoundError(msg)) break;
    }
  }

  return {
    result: localFallback(payload),
    source: "local",
    reason: errors.join(" | "),
  };
}

export function toLatchedBody(
  result: BodyScanGeminiResult,
  profileWeight: number,
  source: "gemini" | "local"
): LatchedBodyData {
  const fatMassKg = (profileWeight * result.fatPercent) / 100;
  return {
    fatPercent: result.fatPercent,
    musclePercent: result.musclePercent,
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    leanMassKg: Math.round((profileWeight - fatMassKg) * 10) / 10,
    lockedAt: new Date().toISOString(),
    clothingDetected: result.clothingLikely,
    fatZones: result.fatZones,
    posture: result.posture,
    geminiReport: result.report,
    source,
  };
}
