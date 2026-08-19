import type { StageTwoScanResult } from "@/lib/scan/scanResult";
import type { BodyAnthropometrics } from "@/lib/bio/anthropometry";
import type { SidePostureMetrics } from "@/lib/scan/postureMetrics";

export type BioFindingSeverity = "info" | "watch" | "priority";
export type SomatotypeHint = "ectomorph" | "mesomorph" | "endomorph" | "mixed";

export interface BioScanFinding {
  id: string;
  severity: BioFindingSeverity;
  category: "posture" | "proportion" | "composition" | "asymmetry" | "quality";
  title: string;
  detail: string;
  /** Мышечные группы / паттерны движений для акцента в плане */
  trainingFocus?: string[];
}

export interface BioScanProfile {
  capturedAt: string | null;
  qualityScore: number | null;
  qualityTier: "low" | "medium" | "high" | null;
  scanUsable: boolean;
  bodyFatPercent: number | null;
  hyperlordosisLikely: boolean | null;
  somatotype: SomatotypeHint;
  findings: BioScanFinding[];
  /** Краткое резюме для UI */
  summaryRu: string;
  /** Развёрнутый блок для промпта Gemini */
  promptBlock: string;
}

function round(n: number, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function bodyFatCategory(pct: number | null): string | null {
  if (pct == null) return null;
  if (pct < 12) return "низкий";
  if (pct < 18) return "athletic";
  if (pct < 25) return "умеренный";
  if (pct < 32) return "повышенный";
  return "высокий";
}

function inferSomatotype(
  anth: BodyAnthropometrics | null,
  bodyFat: number | null,
): SomatotypeHint {
  if (!anth) return "mixed";
  const whr = anth.waistWidthCm / Math.max(anth.hipWidthCm, 1);
  const legTorso = anth.upperLegCm / Math.max(anth.torsoLengthCm, 1);
  const shoulderHip = anth.shoulderWidthCm / Math.max(anth.hipWidthCm, 1);

  if ((bodyFat ?? 20) >= 26 && whr > 0.92) return "endomorph";
  if (shoulderHip > 1.12 && (bodyFat ?? 20) < 22) return "mesomorph";
  if (legTorso > 1.05 && whr < 0.88 && (bodyFat ?? 20) < 20) return "ectomorph";
  return "mixed";
}

function postureFindings(posture: SidePostureMetrics | null): BioScanFinding[] {
  if (!posture) {
    return [
      {
        id: "posture_missing",
        severity: "info",
        category: "quality",
        title: "Профильная осанка не оценена",
        detail: "Нужен боковой ракурс биоскана для анализа изгибов позвоночника и таза.",
        trainingFocus: ["core", "mobility"],
      },
    ];
  }

  const out: BioScanFinding[] = [];

  if (posture.hyperlordosisLikely) {
    out.push({
      id: "hyperlordosis",
      severity: "priority",
      category: "posture",
      title: "Признак выраженного изгиба поясницы (оценка по профилю)",
      detail: `${posture.note} Угол тазобедренного: ${posture.hipAngleDeg}°, отклонение таза: ${posture.pelvicDeviationDeg}°.`,
      trainingFocus: ["core", "glutes", "hamstrings", "avoid_axial_load"],
    });
  }

  if (posture.pelvicDeviationDeg >= 10 && !posture.hyperlordosisLikely) {
    out.push({
      id: "pelvic_tilt_mild",
      severity: "watch",
      category: "posture",
      title: "Лёгкое отклонение положения таза",
      detail: `Отклонение ${posture.pelvicDeviationDeg}° — контроль нейтрального корпуса и мобility бёдер.`,
      trainingFocus: ["core", "hip_mobility"],
    });
  }

  if (posture.kneeAngleDeg < 165) {
    out.push({
      id: "knee_flexion_stance",
      severity: "watch",
      category: "posture",
      title: "Согнутые колени в стойке",
      detail: `Угол колена ${posture.kneeAngleDeg}° — возможна сутулость или смещение веса; акцент на контроль колена в приседе/выпаде.`,
      trainingFocus: ["quads", "glutes", "knee_tracking"],
    });
  }

  if (posture.kneeAngleDeg > 178) {
    out.push({
      id: "knee_hyperextension",
      severity: "watch",
      category: "posture",
      title: "Гиперэкстензия колена",
      detail: `Угол ${posture.kneeAngleDeg}° — не «запирайте» колено в верхней точке, контролируйте амплитуду.`,
      trainingFocus: ["hamstrings", "knee_control"],
    });
  }

  if (posture.confidence === "low") {
    out.push({
      id: "posture_low_conf",
      severity: "info",
      category: "quality",
      title: "Низкая уверенность профильной оценки",
      detail: "Повторите биоскан при ровном освещении и плотной одежде.",
    });
  }

  return out;
}

function proportionFindings(
  anth: BodyAnthropometrics | null,
  segments: StageTwoScanResult["segments"],
  statureCm: number,
): BioScanFinding[] {
  if (!anth) return [];

  const out: BioScanFinding[] = [];
  const whr = anth.waistWidthCm / Math.max(anth.hipWidthCm, 1);
  const shoulderHip = anth.shoulderWidthCm / Math.max(anth.hipWidthCm, 1);
  const legRatio = anth.upperLegCm / Math.max(statureCm, 1);
  const armSpanRatio = anth.armSpanCm / Math.max(statureCm, 1);

  if (whr > 0.95) {
    out.push({
      id: "central_adiposity_proxy",
      severity: "watch",
      category: "proportion",
      title: "Относительно широкая талия к бёдрам (прокси по скану)",
      detail: `WHR≈${round(whr, 2)} — при похудении приоритет: кардио + кор + базовая сила без перегруза поясницы.`,
      trainingFocus: ["core", "conditioning", "glutes"],
    });
  }

  if (shoulderHip < 0.95) {
    out.push({
      id: "narrow_shoulders_proxy",
      severity: "info",
      category: "proportion",
      title: "Узкие плечи относительно бёдер (прокси)",
      detail: "В плане можно усилить верх тела: жим, тяги, дельты (с учётом локации и осанки).",
      trainingFocus: ["shoulders", "back", "chest"],
    });
  }

  if (legRatio < 0.42) {
    out.push({
      id: "short_legs_proxy",
      severity: "info",
      category: "proportion",
      title: "Короткие ноги относительно роста (прокси)",
      detail: "Техника приседа/тяги: возможен больший наклон корпуса — контроль спины.",
      trainingFocus: ["hip_hinge", "core"],
    });
  }

  if (armSpanRatio > 1.06) {
    out.push({
      id: "long_arms",
      severity: "info",
      category: "proportion",
      title: "Длинные руки относительно роста",
      detail: "В жиме и тяге следите за траекторией локтя; возможен комфортный хват шире.",
      trainingFocus: ["chest", "back"],
    });
  }

  if (segments) {
    const forearmStature = segments.forearm.centimeters / statureCm;
    if (forearmStature < 0.115) {
      out.push({
        id: "short_forearm",
        severity: "info",
        category: "proportion",
        title: "Короткое предплечье (измерено на скане)",
        detail: `${segments.forearm.centimeters} см — в жимах может потребоваться другой хват/угol.`,
      });
    }
  }

  return out;
}

function compositionFindings(bodyFat: number | null): BioScanFinding[] {
  const cat = bodyFatCategory(bodyFat);
  if (!cat) {
    return [
      {
        id: "bodyfat_unknown",
        severity: "info",
        category: "composition",
        title: "Процент жира не синхронизирован",
        detail: "Подключите Huawei Health или укажите в профиле для точнее подбора объёма и кардио.",
      },
    ];
  }

  if (bodyFat! >= 28) {
    return [
      {
        id: "bodyfat_high",
        severity: "priority",
        category: "composition",
        title: `Повышенный % жира (${round(bodyFat!)}%, ${cat})`,
        detail: "Приоритет: дефicit + силовая база + NEAT/кардио; прогрессия весов умеренная.",
        trainingFocus: ["conditioning", "full_body", "core"],
      },
    ];
  }

  if (bodyFat! >= 20) {
    return [
      {
        id: "bodyfat_moderate",
        severity: "watch",
        category: "composition",
        title: `Умеренный % жира (${round(bodyFat!)}%)`,
        detail: "Сочетание силовой работы и метаболического объёма; следить за восстановлением.",
        trainingFocus: ["hypertrophy", "conditioning"],
      },
    ];
  }

  return [
    {
      id: "bodyfat_athletic",
      severity: "info",
      category: "composition",
      title: `Низкий/athletic % жира (${round(bodyFat!)}%)`,
      detail: "Можно акцентировать силу или гипертрофию; следить за deload и сном.",
      trainingFocus: ["strength", "hypertrophy"],
    },
  ];
}

function qualityFindings(result: StageTwoScanResult): BioScanFinding[] {
  const issues = result.quality.issues;
  if (issues.length === 0) return [];
  return [
    {
      id: "scan_quality",
      severity: result.quality.tier === "low" ? "watch" : "info",
      category: "quality",
      title: `Качество скана ${result.quality.score}% (${result.quality.tier})`,
      detail: issues.join("; "),
    },
  ];
}

/**
 * Полный профиль биоверификации для планирования — не только гиперлордоз.
 * Источник: JSON `body_scans.result` + body_fat из профиля.
 */
export function buildBioScanProfile(opts: {
  scanResult: StageTwoScanResult | null;
  bodyFatPercent?: number | null;
}): BioScanProfile {
  const { scanResult, bodyFatPercent = null } = opts;

  if (!scanResult) {
    return {
      capturedAt: null,
      qualityScore: null,
      qualityTier: null,
      scanUsable: false,
      bodyFatPercent,
      hyperlordosisLikely: null,
      somatotype: "mixed",
      findings: [
        {
          id: "no_scan",
          severity: "priority",
          category: "quality",
          title: "Биоскан не пройден",
          detail:
            "План будет общим. Пройдите /scan — ИИ анализирует пропорции, осанку, сегменты и качество захвата.",
          trainingFocus: ["full_body"],
        },
      ],
      summaryRu: "Биоскан не пройден — план без персонализации по телу.",
      promptBlock:
        "Биоверификация: НЕТ ДАННЫХ СКАНА. Рекомендуй пользователю пройти /scan. План — консervative full-body.",
    };
  }

  const anth = scanResult.anthropometrics;
  const findings = [
    ...compositionFindings(bodyFatPercent),
    ...postureFindings(scanResult.posture),
    ...proportionFindings(anth, scanResult.segments, scanResult.statureCm),
    ...qualityFindings(scanResult),
  ];

  const somatotype = inferSomatotype(anth, bodyFatPercent);
  const priorityCount = findings.filter((f) => f.severity === "priority").length;
  const scanUsable = scanResult.quality.tier !== "low" && scanResult.quality.score >= 58;

  const anthLines = anth
    ? [
        `Плечи ${anth.shoulderWidthCm} см, грудь ${anth.chestWidthCm} см, талия ${anth.waistWidthCm} см, бёдра ${anth.hipWidthCm} см`,
        `Размах рук ${anth.armSpanCm} см, торс ${anth.torsoLengthCm} см, бедро ${anth.upperLegCm} см`,
        `Уверенность антропометрии: ${anth.confidence}`,
      ]
    : ["Антропометрия: не рассчитана"];

  const segLines = scanResult.segments
    ? [
        `Предплечье ${scanResult.segments.forearm.centimeters} см, бедро (сегмент) ${scanResult.segments.thigh.centimeters} см`,
      ]
    : [];

  const postureLines = scanResult.posture
    ? [
        `Профиль: тазобедренный ${scanResult.posture.hipAngleDeg}°, колено ${scanResult.posture.kneeAngleDeg}°, отклонение таза ${scanResult.posture.pelvicDeviationDeg}°`,
        scanResult.posture.note,
      ]
    : ["Профильная осанка: нет"];

  const findingLines = findings.map(
    (f) => `[${f.severity}] ${f.title}: ${f.detail}`,
  );

  const promptBlock = [
    "=== БИОВЕРИФИКАЦИЯ (видео-скан, не одна галочка) ===",
    `Дата скана: ${scanResult.capturedAt}`,
    `Качество: ${scanResult.quality.score}% (${scanResult.quality.tier}), фронт ${scanResult.views.front.fullBodyScore}, профиль ${scanResult.views.side.fullBodyScore}`,
    `Комплекция (эвристика): ${somatotype}`,
    bodyFatPercent != null ? `% жира (Health/профиль): ${round(bodyFatPercent)}` : "% жира: нет данных",
    ...anthLines,
    ...segLines,
    ...postureLines,
    "",
    "Выявленные отклонения и акценты (оценка, не диагноз):",
    ...findingLines,
    "",
    "Используй ВСЕ пункты выше при подборе упражнений, объёма и длительности цикла.",
    "VBT-скорость повторений — из тренировок, не из скана.",
  ].join("\n");

  const summaryRu =
    priorityCount > 0
      ? `Скан ${scanResult.quality.score}%: ${priorityCount} приоритетных находок, комплекция ${somatotype}`
      : `Скан ${scanResult.quality.score}%: ${findings.length} параметров тела, комплекция ${somatotype}`;

  return {
    capturedAt: scanResult.capturedAt,
    qualityScore: scanResult.quality.score,
    qualityTier: scanResult.quality.tier,
    scanUsable,
    bodyFatPercent,
    hyperlordosisLikely: scanResult.hyperlordosisLikely,
    somatotype,
    findings,
    summaryRu,
    promptBlock,
  };
}
