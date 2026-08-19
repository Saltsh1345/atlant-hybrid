import type { ConstraintTag } from "@/lib/training/corrective/types";

export interface ExerciseMetaEntry {
  /** Теги, которым помогает упражнение (prehab/corrective). */
  helps: ConstraintTag[];
  /** При активном теге — упражнение нежелательно. */
  contraindicated: ConstraintTag[];
}

/** Метаданные силовых упражнений каталога (без правки каждой записи EXERCISE_CATALOG). */
export const EXERCISE_META: Record<string, ExerciseMetaEntry> = {
  squat: {
    helps: ["knee_tracking", "glute_activation"],
    contraindicated: ["avoid_axial_load", "avoid_deep_knee_flexion", "knee_tracking"],
  },
  bench: {
    helps: ["shoulder_stability"],
    contraindicated: ["shoulder_stability"],
  },
  lunge: {
    helps: ["knee_tracking", "glute_activation", "hip_mobility"],
    contraindicated: ["avoid_deep_knee_flexion", "knee_control"],
  },
  deadlift: {
    helps: ["hamstring_strength", "glute_activation"],
    contraindicated: ["avoid_axial_load", "lower_back_care"],
  },
  barbell_row: {
    helps: ["shoulder_stability"],
    contraindicated: ["avoid_axial_load", "lower_back_care"],
  },
  overhead_press: {
    helps: ["shoulder_stability"],
    contraindicated: ["avoid_overhead", "avoid_axial_load", "shoulder_stability"],
  },
  pull_up: {
    helps: ["shoulder_stability"],
    contraindicated: ["shoulder_stability"],
  },
  lat_pulldown: { helps: ["shoulder_stability"], contraindicated: [] },
  hip_thrust: {
    helps: ["glute_activation", "pelvic_stability", "lower_back_care"],
    contraindicated: [],
  },
  romanian_deadlift: {
    helps: ["hamstring_strength", "hip_mobility"],
    contraindicated: ["avoid_axial_load", "lower_back_care"],
  },
  leg_press: {
    helps: ["glute_activation", "knee_tracking"],
    contraindicated: ["avoid_deep_knee_flexion"],
  },
  leg_curl: { helps: ["hamstring_strength", "knee_control"], contraindicated: [] },
  lateral_raise: { helps: ["shoulder_stability"], contraindicated: [] },
  face_pull: { helps: ["shoulder_stability", "pelvic_stability"], contraindicated: [] },
  rotator_cuff: { helps: ["shoulder_stability"], contraindicated: [] },
  seated_row: { helps: ["shoulder_stability", "lower_back_care"], contraindicated: [] },
  plank_core: {
    helps: ["core_stability", "lower_back_care", "pelvic_stability"],
    contraindicated: [],
  },
  push_up: { helps: ["core_stability"], contraindicated: ["shoulder_stability"] },
  hip_abduction: {
    helps: ["glute_activation", "knee_tracking", "hip_mobility", "pelvic_stability"],
    contraindicated: [],
  },
  single_leg_rdl: {
    helps: ["hamstring_strength", "hip_mobility", "knee_control"],
    contraindicated: ["avoid_axial_load"],
  },
  calf_raise: { helps: ["knee_control"], contraindicated: [] },
  biceps_curl: { helps: [], contraindicated: [] },
  triceps_extension: { helps: [], contraindicated: [] },
  chest_fly: { helps: ["shoulder_stability"], contraindicated: ["shoulder_stability"] },
};

/** Замена при конфликте: exerciseId → альтернатива по приоритету тега. */
export const EXERCISE_SWAPS: Record<string, Partial<Record<ConstraintTag, string>>> = {
  squat: {
    avoid_axial_load: "leg_press",
    avoid_deep_knee_flexion: "hip_thrust",
    knee_tracking: "leg_press",
  },
  deadlift: {
    avoid_axial_load: "hip_thrust",
    lower_back_care: "hip_thrust",
  },
  romanian_deadlift: {
    avoid_axial_load: "leg_curl",
    lower_back_care: "single_leg_rdl",
  },
  overhead_press: {
    avoid_overhead: "lateral_raise",
    avoid_axial_load: "lateral_raise",
    shoulder_stability: "face_pull",
  },
  barbell_row: {
    avoid_axial_load: "seated_row",
    lower_back_care: "seated_row",
  },
  bench: { shoulder_stability: "push_up" },
  lunge: {
    avoid_deep_knee_flexion: "hip_abduction",
    knee_control: "leg_curl",
  },
  pull_up: { shoulder_stability: "lat_pulldown" },
};

/** Коррекционные упражнения для добавления в день (prehab). */
export const CORRECTIVE_POOL: Record<ConstraintTag, string[]> = {
  avoid_axial_load: ["plank_core", "hip_thrust"],
  avoid_overhead: ["rotator_cuff", "face_pull"],
  avoid_deep_knee_flexion: ["hip_abduction", "leg_curl"],
  knee_tracking: ["hip_abduction", "plank_core"],
  knee_control: ["leg_curl", "calf_raise"],
  core_stability: ["plank_core"],
  hip_mobility: ["hip_abduction", "single_leg_rdl"],
  glute_activation: ["hip_thrust", "hip_abduction"],
  shoulder_stability: ["rotator_cuff", "face_pull"],
  hamstring_strength: ["leg_curl", "single_leg_rdl"],
  pelvic_stability: ["plank_core", "hip_abduction"],
  lower_back_care: ["plank_core", "hip_thrust"],
  conditioning_priority: ["push_up", "lunge"],
};

/** Приоритет тегов для swap (сначала более критичные). */
export const TAG_PRIORITY: ConstraintTag[] = [
  "avoid_axial_load",
  "lower_back_care",
  "avoid_overhead",
  "avoid_deep_knee_flexion",
  "knee_tracking",
  "knee_control",
  "shoulder_stability",
  "pelvic_stability",
  "core_stability",
  "glute_activation",
  "hip_mobility",
  "hamstring_strength",
  "conditioning_priority",
];

export function metaForExercise(id: string): ExerciseMetaEntry {
  return EXERCISE_META[id] ?? { helps: [], contraindicated: [] };
}
