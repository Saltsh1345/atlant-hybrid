import type { BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";
import type { HealthConcernId } from "@/lib/training/intake/types";
import type {
  BodyConstraintProfile,
  ConstraintSource,
  ConstraintTag,
} from "@/lib/training/corrective/types";

const FOCUS_TO_TAG: Record<string, ConstraintTag> = {
  core: "core_stability",
  glutes: "glute_activation",
  hamstrings: "hamstring_strength",
  avoid_axial_load: "avoid_axial_load",
  mobility: "hip_mobility",
  hip_mobility: "hip_mobility",
  knee_tracking: "knee_tracking",
  knee_control: "knee_control",
  conditioning: "conditioning_priority",
  shoulders: "shoulder_stability",
  back: "lower_back_care",
  chest: "shoulder_stability",
  hip_hinge: "hamstring_strength",
  full_body: "core_stability",
  hypertrophy: "conditioning_priority",
  strength: "core_stability",
};

const FINDING_TO_TAG: Record<string, ConstraintTag[]> = {
  hyperlordosis: ["avoid_axial_load", "core_stability", "glute_activation", "lower_back_care"],
  pelvic_tilt_mild: ["pelvic_stability", "core_stability", "hip_mobility"],
  knee_flexion_stance: ["knee_tracking", "glute_activation"],
  knee_hyperextension: ["knee_control", "hamstring_strength"],
  central_adiposity_proxy: ["conditioning_priority", "core_stability"],
  bodyfat_high: ["conditioning_priority", "core_stability"],
  bodyfat_moderate: ["conditioning_priority"],
  short_legs_proxy: ["lower_back_care", "core_stability"],
};

const HEALTH_TO_TAG: Record<HealthConcernId, ConstraintTag[]> = {
  lower_back: ["avoid_axial_load", "lower_back_care", "core_stability", "pelvic_stability"],
  knee: ["knee_tracking", "avoid_deep_knee_flexion", "knee_control"],
  shoulder: ["shoulder_stability", "avoid_overhead"],
  neck: ["avoid_overhead", "core_stability", "shoulder_stability"],
  hip: ["hip_mobility", "glute_activation", "pelvic_stability"],
  wrist_elbow: ["shoulder_stability"],
  post_surgery: ["core_stability", "avoid_axial_load", "avoid_overhead"],
  general_mobility: ["hip_mobility", "core_stability"],
};

const NOTES_KEYWORDS: Array<{ pattern: RegExp; tags: ConstraintTag[]; label: string }> = [
  { pattern: /поясниц|спин|lordos|гиперлордоз/i, tags: ["avoid_axial_load", "lower_back_care"], label: "комментарий: поясница" },
  { pattern: /колен|meniscus|мениск/i, tags: ["knee_tracking", "avoid_deep_knee_flexion"], label: "комментарий: колено" },
  { pattern: /плеч|shoulder|ротатор/i, tags: ["shoulder_stability", "avoid_overhead"], label: "комментарий: плечо" },
  { pattern: /шея|neck|cervical/i, tags: ["avoid_overhead", "core_stability"], label: "комментарий: шея" },
  { pattern: /таз|hip|бедр/i, tags: ["hip_mobility", "glute_activation"], label: "комментарий: таз/бедро" },
  { pattern: /операц|травм|rehab|реабил/i, tags: ["core_stability", "avoid_axial_load"], label: "комментарий: травма/реабилитация" },
];

function addTags(
  map: Map<ConstraintTag, ConstraintSource>,
  tags: ConstraintTag[],
  source: ConstraintSource,
) {
  for (const tag of tags) {
    if (!map.has(tag)) map.set(tag, source);
  }
}

/**
 * Сводит биоскан + опросник + текст клиента в единый профиль ограничений.
 */
export function buildConstraintProfile(opts: {
  bioScan?: BioScanProfile | null;
  healthConcerns?: HealthConcernId[];
  notes?: string | null;
}): BodyConstraintProfile {
  const map = new Map<ConstraintTag, ConstraintSource>();
  const { bioScan, healthConcerns = [], notes } = opts;

  if (bioScan?.findings.length) {
    for (const f of bioScan.findings) {
      const fromId = FINDING_TO_TAG[f.id] ?? [];
      addTags(map, fromId, {
        tag: fromId[0] ?? "core_stability",
        kind: "scan",
        label: f.title,
      });

      for (const focus of f.trainingFocus ?? []) {
        const tag = FOCUS_TO_TAG[focus];
        if (tag) {
          addTags(map, [tag], { tag, kind: "scan", label: f.title });
        }
      }

      if (f.severity === "priority" && fromId.length === 0 && f.category === "posture") {
        addTags(map, ["core_stability"], {
          tag: "core_stability",
          kind: "scan",
          label: f.title,
        });
      }
    }
  }

  if (bioScan?.hyperlordosisLikely === true) {
    addTags(
      map,
      ["avoid_axial_load", "core_stability", "glute_activation", "lower_back_care"],
      { tag: "avoid_axial_load", kind: "scan", label: "Гиперлордоз (профиль)" },
    );
  }

  for (const concern of healthConcerns) {
    const tags = HEALTH_TO_TAG[concern] ?? [];
    const label =
      concern === "lower_back"
        ? "Опросник: поясница"
        : concern === "knee"
          ? "Опросник: колено"
          : concern === "shoulder"
            ? "Опросник: плечо"
            : concern === "neck"
              ? "Опросник: шея"
              : concern === "hip"
                ? "Опросник: бедро/таз"
                : concern === "wrist_elbow"
                  ? "Опросник: запястье/локоть"
                  : concern === "post_surgery"
                    ? "Опросник: после операции"
                    : "Опросник: мобility";

    for (const tag of tags) {
      addTags(map, [tag], { tag, kind: "intake", label });
    }
  }

  if (notes?.trim()) {
    for (const rule of NOTES_KEYWORDS) {
      if (rule.pattern.test(notes)) {
        for (const tag of rule.tags) {
          addTags(map, [tag], { tag, kind: "notes", label: rule.label });
        }
      }
    }
  }

  const activeTags = [...map.keys()];
  const sources = [...map.values()];

  const priorityLabels = sources
    .filter((s) => s.kind === "scan" || s.kind === "intake")
    .map((s) => s.label)
    .slice(0, 6);

  const summaryRu =
    activeTags.length === 0
      ? "Ограничений не выявлено — стандартный силовой план."
      : `Учтено ${activeTags.length} акцентов коррекции: ${priorityLabels.join("; ") || "по скану и опроснику"}.`;

  const promptBlock = [
    "=== КОРРЕКЦИЯ И ОГРАНИЧЕНИЯ (скан + клиент, не диагноз) ===",
    summaryRu,
    activeTags.length
      ? `Активные теги: ${activeTags.join(", ")}.`
      : "Активных ограничений нет.",
    sources.length
      ? "Источники:\n" + sources.map((s) => `- [${s.kind}] ${s.label}`).join("\n")
      : "",
    "",
    "Правила:",
    "1. Сохраняй силовой план, но заменяй упражнения при конфликте с ограничениями.",
    "2. Добавляй 1–2 коррекционных/prehab упражнения в день (кор, ягодицы, ротатор, мобility).",
    "3. Не назначай осевую нагрузку при avoid_axial_load; не жми стоя при avoid_overhead.",
    "4. Это оценка и рекомендации, не медицинский диагноз.",
  ]
    .filter(Boolean)
    .join("\n");

  return { activeTags, sources, summaryRu, promptBlock };
}
