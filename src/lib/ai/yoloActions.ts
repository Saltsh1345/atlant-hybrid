import type { SessionVideoClip } from "@/lib/training/sessionVideoClips";
import type { Sport } from "@/types";
import {
  actionsMatchExpected,
  expectedActionForClip,
  isActionAllowedForSport,
  normalizeAtlantAction,
  SPORT_ACTION_CLASSES,
} from "@/lib/ai/yoloActionMap";

export interface YoloClipSignal {
  clipId: string;
  confidence: number;
  action: string;
  matchesExpected: boolean;
  notes?: string;
}

interface RoboflowPrediction {
  class?: string;
  confidence?: number;
}

interface YoloProviderConfig {
  provider: "roboflow" | "ultralytics" | "custom";
  baseUrl: string;
  apiKey: string;
  model: string;
  version: string;
  timeoutMs: number;
  confidence: number;
}

function bestPrediction(
  preds: RoboflowPrediction[],
  sport?: Sport
): RoboflowPrediction | null {
  const filtered = sport
    ? preds.filter((p) =>
        isActionAllowedForSport(sport, p.class ?? "unknown")
      )
    : preds;
  const list = filtered.length ? filtered : preds;
  if (!list.length) return null;
  return list.reduce((best, p) => {
    const score = p.confidence ?? 0;
    const bestScore = best.confidence ?? 0;
    return score > bestScore ? p : best;
  });
}

function resolveProviderConfig(sport: Sport): YoloProviderConfig | null {
  const providerRaw = process.env.YOLO_PROVIDER?.trim().toLowerCase() ?? "";
  const provider =
    providerRaw === "roboflow" ||
    providerRaw === "ultralytics" ||
    providerRaw === "custom"
      ? providerRaw
      : null;

  const inferredProvider = provider ?? inferProviderFromEnv();
  const apiKey =
    process.env.YOLO_API_KEY?.trim() ??
    process.env.ROBOFLOW_API_KEY?.trim() ??
    process.env.ULTRALYTICS_API_KEY?.trim() ??
    "";
  const model = process.env.YOLO_MODEL?.trim() ?? "atlant-actions";
  const version = process.env.YOLO_MODEL_VERSION?.trim() ?? "1";
  const timeoutMs = Number(process.env.YOLO_TIMEOUT_MS ?? 9000);
  const confidence = Number(process.env.ROBOFLOW_CONFIDENCE ?? 0.4);

  if (inferredProvider === "roboflow") {
    const explicit = process.env.YOLO_API_URL?.trim();
    const project = process.env.ROBOFLOW_PROJECT?.trim() ?? model;
    const ver = process.env.ROBOFLOW_VERSION?.trim() ?? version;
    const baseUrl =
      explicit ||
      `https://serverless.roboflow.com/${encodeURIComponent(project)}/${encodeURIComponent(ver)}`;
    if (!apiKey) return null;
    return {
      provider: "roboflow",
      baseUrl,
      apiKey,
      model: project,
      version: ver,
      timeoutMs,
      confidence,
    };
  }

  if (inferredProvider === "ultralytics") {
    const baseUrl =
      process.env.YOLO_API_URL?.trim() ??
      process.env.ULTRALYTICS_API_URL?.trim() ??
      "https://api.ultralytics.com/v1/predict";
    if (!apiKey) return null;
    return {
      provider: "ultralytics",
      baseUrl,
      apiKey,
      model,
      version,
      timeoutMs,
      confidence,
    };
  }

  const customUrl = process.env.YOLO_API_URL?.trim();
  if (!customUrl) return null;
  return {
    provider: "custom",
    baseUrl: customUrl,
    apiKey,
    model,
    version,
    timeoutMs,
    confidence,
  };
}

function inferProviderFromEnv(): YoloProviderConfig["provider"] {
  if (process.env.ROBOFLOW_API_KEY || process.env.ROBOFLOW_PROJECT)
    return "roboflow";
  if (process.env.ULTRALYTICS_API_KEY || process.env.ULTRALYTICS_API_URL)
    return "ultralytics";
  return "custom";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

async function requestWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseRoboflowPredictions(data: Record<string, unknown>): RoboflowPrediction[] {
  const out: RoboflowPrediction[] = [];

  const pushList = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const cls = String(row.class ?? row.class_name ?? row.label ?? "");
      const conf = Number(row.confidence ?? row.score ?? 0);
      if (cls) out.push({ class: cls, confidence: conf });
    }
  };

  pushList(data.predictions);
  pushList(data.predicted_classes);

  const outputs = data.outputs;
  if (Array.isArray(outputs)) {
    for (const block of outputs) {
      if (block && typeof block === "object") {
        pushList((block as Record<string, unknown>).predictions);
      }
    }
  }

  return out;
}

/** Roboflow Serverless v2 — multipart file upload (recommended). */
async function callRoboflow(
  cfg: YoloProviderConfig,
  clip: SessionVideoClip,
  sport: Sport
): Promise<{ action: string; confidence: number; notes?: string }> {
  const b64 = clip.previewFrameBase64 ?? "";
  if (!b64) throw new Error("roboflow_no_frame");

  const bytes = Buffer.from(b64, "base64");
  const blob = new Blob([bytes], { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", blob, "frame.jpg");

  const url = new URL(cfg.baseUrl);
  url.searchParams.set("api_key", cfg.apiKey);
  url.searchParams.set("confidence", String(cfg.confidence));

  const res = await requestWithTimeout(
    url.toString(),
    { method: "POST", body: form },
    cfg.timeoutMs
  );
  if (!res.ok) throw new Error(`roboflow_http_${res.status}`);

  const data = (await res.json()) as Record<string, unknown>;
  const list = parseRoboflowPredictions(data);
  const best = bestPrediction(list, sport);
  const action = normalizeAtlantAction(best?.class ?? "unknown");
  const allowed = SPORT_ACTION_CLASSES[sport];
  const note =
    list.length === 0
      ? "Нет детекций — модель ещё не обучена или кадр вне кадра"
      : !isActionAllowedForSport(sport, action)
        ? `Детект ${action}, ожидались: ${allowed.join(", ")}`
        : undefined;

  return {
    action,
    confidence: clamp01(Number(best?.confidence ?? 0)),
    notes: note,
  };
}

async function callUltralytics(
  cfg: YoloProviderConfig,
  clip: SessionVideoClip,
  sport: Sport
): Promise<{ action: string; confidence: number; notes?: string }> {
  const res = await requestWithTimeout(
    cfg.baseUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        image: `data:image/jpeg;base64,${clip.previewFrameBase64 ?? ""}`,
        confidence: cfg.confidence,
      }),
    },
    cfg.timeoutMs
  );
  if (!res.ok) throw new Error(`ultralytics_http_${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  const list = parseRoboflowPredictions(data);
  const best = bestPrediction(list, sport);
  return {
    action: normalizeAtlantAction(best?.class ?? "unknown"),
    confidence: clamp01(Number(best?.confidence ?? 0)),
  };
}

async function callCustom(
  cfg: YoloProviderConfig,
  clip: SessionVideoClip,
  expectedAction: string
): Promise<{ action: string; confidence: number; notes?: string }> {
  const res = await requestWithTimeout(
    cfg.baseUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        version: cfg.version,
        image: clip.previewFrameBase64,
        clipLabel: clip.label,
        expectedAction,
      }),
    },
    cfg.timeoutMs
  );
  if (!res.ok) throw new Error(`custom_http_${res.status}`);

  const data = (await res.json()) as Record<string, unknown>;
  const list = parseRoboflowPredictions(data);
  let action = normalizeAtlantAction(String(data.action ?? ""));
  let confidence = clamp01(Number(data.confidence ?? 0));
  if ((!action || action === "unknown") && list.length) {
    const best = bestPrediction(list);
    if (best) {
      action = normalizeAtlantAction(best.class ?? "unknown");
      confidence = clamp01(Number(best.confidence ?? confidence));
    }
  }
  return {
    action: action || "unknown",
    confidence,
    notes: typeof data.notes === "string" ? data.notes : undefined,
  };
}

export async function runYoloActionSignals(
  clips: SessionVideoClip[],
  sport: Sport
): Promise<{ signals: YoloClipSignal[]; reason?: string }> {
  const cfg = resolveProviderConfig(sport);
  if (!cfg) {
    return {
      signals: [],
      reason:
        "YOLO не сконфигурирован. Задайте ROBOFLOW_API_KEY + ROBOFLOW_PROJECT=atlant-actions (после Train — VERSION=1).",
    };
  }

  const signals: YoloClipSignal[] = [];
  const errors: string[] = [];

  for (const clip of clips.slice(0, 6)) {
    if (!clip.previewFrameBase64) continue;
    try {
      const expected = expectedActionForClip(
        clip.expectedAction,
        clip.label
      );
      let out: { action: string; confidence: number; notes?: string };
      if (cfg.provider === "roboflow") {
        out = await callRoboflow(cfg, clip, sport);
      } else if (cfg.provider === "ultralytics") {
        out = await callUltralytics(cfg, clip, sport);
      } else {
        out = await callCustom(cfg, clip, expected);
      }
      signals.push({
        clipId: clip.id,
        confidence: clamp01(out.confidence),
        action: out.action || "unknown",
        matchesExpected: actionsMatchExpected(expected, out.action),
        notes: out.notes,
      });
    } catch (e) {
      errors.push(`${clip.id}: ${e instanceof Error ? e.message : "request_error"}`);
    }
  }

  return {
    signals,
    reason: errors.length ? errors.join(" | ") : undefined,
  };
}
