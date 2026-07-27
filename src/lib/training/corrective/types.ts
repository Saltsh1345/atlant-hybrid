/** Теги ограничений / акцентов для подбора и коррекции упражнений. */
export type ConstraintTag =
  | "avoid_axial_load"
  | "avoid_overhead"
  | "avoid_deep_knee_flexion"
  | "knee_tracking"
  | "knee_control"
  | "core_stability"
  | "hip_mobility"
  | "glute_activation"
  | "shoulder_stability"
  | "hamstring_strength"
  | "pelvic_stability"
  | "lower_back_care"
  | "conditioning_priority";

export interface ConstraintSource {
  tag: ConstraintTag;
  /** scan | intake | notes */
  kind: "scan" | "intake" | "notes";
  label: string;
}

/** Сводный профиль ограничений: скан + опросник + текст клиента. */
export interface BodyConstraintProfile {
  activeTags: ConstraintTag[];
  sources: ConstraintSource[];
  /** Для Gemini / UI */
  summaryRu: string;
  promptBlock: string;
}

export type ExercisePlanRole = "main" | "corrective" | "substitution";
