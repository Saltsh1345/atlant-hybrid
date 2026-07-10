import type { LatchedBodyData, SessionSummary, UserProfile } from "@/types";
import type { VideoDiagnosticReport, WeakZone } from "@/types/training";
import type { ReadinessReport } from "@/lib/readiness";
import {
  asymmetryFromSessionSamples,
} from "@/lib/diagnostics/poseAsymmetry";
import { EXERCISE_CATALOG } from "@/lib/training/exerciseCatalog";

const GROUP_MESHES: Record<string, string[]> = {
  Ноги: [
    "quadriceps_l",
    "quadriceps_r",
    "glutes_l",
    "glutes_r",
    "hamstrings_l",
    "hamstrings_r",
    "calves_l",
    "calves_r",
  ],
  Спина: ["back_c", "back_l", "back_r", "glutes_c"],
  Грудь: ["chest_l", "chest_r"],
  Плечи: ["shoulders_l", "shoulders_r", "triceps_l", "triceps_r"],
  Кор: ["abs_c", "abs_l", "abs_r"],
};

function uid(): string {
  return `diag-${Date.now().toString(36)}`;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function weakFromScan(latched: LatchedBodyData): WeakZone[] {
  const zones: WeakZone[] = [];
  const summary = latched.posture;
  const anth = latched.anthropometrics;

  if (summary?.shoulders?.includes("асимметр")) {
    zones.push({
      id: "wz-shoulders",
      muscleGroup: "Плечи",
      meshes: ["shoulders_l", "shoulders_r"],
      side: "both",
      severity: 62,
      causes: [summary.shoulders],
      source: "posture",
    });
  }
  if (summary?.hips?.includes("смещ") || summary?.hips?.includes("наклон")) {
    zones.push({
      id: "wz-hips",
      muscleGroup: "Ноги",
      meshes: ["glutes_l", "glutes_r", "hamstrings_l", "hamstrings_r"],
      side: "both",
      severity: 58,
      causes: [summary.hips],
      source: "posture",
    });
  }
  if (summary?.spine?.includes("наклон") || summary?.alignment?.includes("асимметр")) {
    zones.push({
      id: "wz-spine",
      muscleGroup: "Спина",
      meshes: ["back_c", "back_l", "back_r", "abs_c"],
      severity: 65,
      causes: [summary.spine, summary.alignment].filter(Boolean) as string[],
      source: "body_scan",
    });
  }

  const fat = latched.fatZones;
  if (fat && (fat.abdomen > 0.45 || fat.hips > 0.4)) {
    zones.push({
      id: "wz-core-fat",
      muscleGroup: "Кор",
      meshes: ["abs_c", "abs_l", "abs_r", "glutes_c"],
      severity: Math.round(clamp((fat.abdomen + fat.hips) * 55, 40, 78)),
      causes: ["Повышенный жир в зоне живота/бёдер — кор слабее визуально"],
      source: "body_scan",
    });
  }

  if (anth && anth.shoulderWidthCm > 0 && anth.hipWidthCm > 0) {
    const ratio = anth.shoulderWidthCm / anth.hipWidthCm;
    if (ratio < 1.05) {
      zones.push({
        id: "wz-upper-weak",
        muscleGroup: "Плечи",
        meshes: GROUP_MESHES["Плечи"],
        severity: 55,
        causes: ["Узкий плечевой пояс относительно бёдер — акцент на верх"],
        source: "body_scan",
      });
    }
  }

  if (latched.clothingDetected) {
    for (const z of zones) {
      z.severity = Math.min(100, z.severity + 5);
      z.causes.push("Одежда на скане — уточните в облегающей форме");
    }
  }

  return zones;
}

function weakFromSessions(history: SessionSummary[]): WeakZone[] {
  const zones: WeakZone[] = [];
  const recent = history.slice(0, 8);

  for (const s of recent) {
    const score = s.formScore ?? 100;
    if (score >= 70) continue;

    const ex = EXERCISE_CATALOG.find(
      (e) =>
        e.strengthExercise === s.exercise ||
        (e.sport === s.sport && !e.strengthExercise)
    );
    const meshes = ex?.primaryMuscles ?? GROUP_MESHES["Кор"];
    const group = ex?.muscleGroups[0] ?? "Кор";

    zones.push({
      id: `wz-session-${s.completedAt}`,
      muscleGroup: group,
      meshes,
      severity: clamp(Math.round(100 - score), 45, 85),
      causes: [
        `Техника ${score}% на ${ex?.name ?? s.sport}`,
        s.aiAnalysis?.slice(0, 120) ?? "Ошибки по видеоанализу",
      ],
      source: "session_form",
    });

    const asym = asymmetryFromSessionSamples(s.samples);
    if (asym.notes.length) {
      zones.push({
        id: `wz-vel-${s.completedAt}`,
        muscleGroup: group,
        meshes,
        severity: 52,
        causes: asym.notes,
        source: "velocity",
      });
    }
  }

  return zones;
}

function weakFromReadiness(readiness: ReadinessReport): WeakZone[] {
  return readiness.groups
    .filter((g) => g.percent < 58)
    .map((g) => ({
      id: `wz-ready-${g.name}`,
      muscleGroup: g.name,
      meshes: GROUP_MESHES[g.name] ?? GROUP_MESHES["Кор"],
      severity: clamp(Math.round(100 - g.percent), 40, 75),
      causes: [`Группа «${g.name}» восстановлена на ${g.percent}%`],
      source: "readiness" as const,
    }));
}

function mergeWeakZones(zones: WeakZone[]): WeakZone[] {
  const byGroup = new Map<string, WeakZone>();
  for (const z of zones) {
    const key = `${z.muscleGroup}-${z.side ?? "both"}`;
    const prev = byGroup.get(key);
    if (!prev || z.severity > prev.severity) {
      byGroup.set(key, {
        ...z,
        causes: [...new Set([...(prev?.causes ?? []), ...z.causes])].slice(0, 4),
      });
    }
  }
  return [...byGroup.values()].sort((a, b) => b.severity - a.severity);
}

export function runVideoDiagnostics(opts: {
  latchedBody: LatchedBodyData | null;
  profile: UserProfile | null;
  sessionHistory: SessionSummary[];
  readiness: ReadinessReport;
}): VideoDiagnosticReport | null {
  const { latchedBody, profile, sessionHistory, readiness } = opts;
  if (!latchedBody && sessionHistory.length === 0) return null;

  const sourcesUsed: string[] = [];
  const allWeak: WeakZone[] = [];
  const postureIssues: string[] = [];
  const strengths: string[] = [];

  if (latchedBody) {
    sourcesUsed.push("биоскан", "поза MediaPipe", "силуэт");
    allWeak.push(...weakFromScan(latchedBody));
    if (latchedBody.posture?.spine) postureIssues.push(latchedBody.posture.spine);
    if (latchedBody.posture?.shoulders) postureIssues.push(latchedBody.posture.shoulders);
    if (latchedBody.musclePercent >= 42) {
      strengths.push(`Мышечная масса ~${latchedBody.musclePercent}%`);
    }
  }

  if (sessionHistory.length) {
    sourcesUsed.push("VBT", "видео Gemini", "углы суставов");
    allWeak.push(...weakFromSessions(sessionHistory));
    const good = sessionHistory.filter((s) => (s.formScore ?? 0) >= 80);
    if (good.length) {
      strengths.push(`Стабильная техника: ${good.length} сессий ≥80%`);
    }
  }

  if (readiness.overall > 0) {
    sourcesUsed.push("готовность мышц");
    allWeak.push(...weakFromReadiness(readiness));
  }

  const weakZones = mergeWeakZones(allWeak).slice(0, 8);

  const shoulderAsym = latchedBody?.posture?.shoulders?.includes("асимметр")
    ? 0.04
    : 0.01;
  const hipAsym = latchedBody?.posture?.hips?.includes("смещ") ? 0.035 : 0.01;

  const avgForm =
    sessionHistory.length > 0
      ? sessionHistory.reduce((s, x) => s + (x.formScore ?? 70), 0) /
        sessionHistory.length
      : 72;

  const overallScore = Math.round(
    clamp(
      avgForm * 0.45 +
        readiness.overall * 0.25 +
        (100 - weakZones.reduce((s, z) => s + z.severity, 0) / Math.max(1, weakZones.length)) *
          0.3,
      35,
      95
    )
  );

  const label =
    overallScore >= 80
      ? "Хорошая база — точечная работа на слабые зоны"
      : overallScore >= 60
        ? "Есть дисбалансы — нужен структурированный план"
        : "Приоритет: техника и слабые звенья";

  const recommendations: string[] = [];
  if (!latchedBody) {
    recommendations.push("Пройдите биоскан для карты осанки и силуэта");
  }
  if (weakZones.length) {
    recommendations.push(
      `Фокус: ${weakZones
        .slice(0, 3)
        .map((z) => z.muscleGroup)
        .join(", ")}`
    );
  }
  if (latchedBody?.clothingDetected) {
    recommendations.push("Пересканируйте в облегающей одежде для точной карты");
  }
  if (profile?.injuries?.trim()) {
    recommendations.push(`Учитывайте травмы: ${profile.injuries}`);
  }
  recommendations.push(
    "Камера отслеживает: позу, углы, скорость (VBT), асимметрию, силуэт"
  );

  return {
    id: uid(),
    generatedAt: new Date().toISOString(),
    overallScore,
    label,
    weakZones,
    strengths,
    postureIssues,
    asymmetry: {
      shoulders: shoulderAsym,
      hips: hipAsym,
      limbNotes: weakZones
        .filter((z) => z.source === "velocity" || z.source === "asymmetry")
        .flatMap((z) => z.causes)
        .slice(0, 3),
    },
    recommendations,
    sourcesUsed: [...new Set(sourcesUsed)],
  };
}

export function weakZoneMeshes(report: VideoDiagnosticReport | null): string[] {
  if (!report) return [];
  return [
    ...new Set(
      report.weakZones
        .filter((z) => z.severity >= 50)
        .flatMap((z) => z.meshes)
    ),
  ];
}
