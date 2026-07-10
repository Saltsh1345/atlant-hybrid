import type { Sport } from "@/types";

/** Roboflow atlant-actions model classes (after train). */
export const ATLANT_ACTION_CLASSES = [
  "jab",
  "cross",
  "hook",
  "forehand",
  "backhand",
  "serve",
  "squat",
  "bench",
  "lunge",
] as const;

export type AtlantActionClass = (typeof ATLANT_ACTION_CLASSES)[number];

export const SPORT_ACTION_CLASSES: Record<Sport, AtlantActionClass[]> = {
  boxing: ["jab", "cross", "hook"],
  tennis: ["forehand", "backhand", "serve"],
  strength: ["squat", "bench", "lunge"],
};

export function normalizeAtlantAction(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("jab")) return "jab";
  if (n.includes("cross")) return "cross";
  if (n.includes("hook")) return "hook";
  if (n.includes("forehand")) return "forehand";
  if (n.includes("backhand")) return "backhand";
  if (n.includes("serve")) return "serve";
  if (n.includes("squat")) return "squat";
  if (n.includes("bench") || n.includes("press")) return "bench";
  if (n.includes("lunge")) return "lunge";
  if (n.includes("combo")) return "combo";
  return n || "unknown";
}

/** Drill command / exercise id → canonical action for YOLO match. */
export function expectedActionForClip(
  expectedAction: string,
  label: string
): string {
  const raw = normalizeAtlantAction(expectedAction || label);
  if (raw !== "unknown") return raw;
  const fromLabel = normalizeAtlantAction(label);
  return fromLabel;
}

/**
 * Whether YOLO detection matches the drill command.
 * combo → jab or cross counts as match.
 */
export function actionsMatchExpected(
  expected: string,
  detected: string
): boolean {
  const exp = normalizeAtlantAction(expected);
  const det = normalizeAtlantAction(detected);
  if (det === "unknown") return false;
  if (exp === det) return true;
  if (exp === "combo" && (det === "jab" || det === "cross")) return true;
  return false;
}

export function isActionAllowedForSport(
  sport: Sport,
  action: string
): boolean {
  const a = normalizeAtlantAction(action);
  if (a === "unknown" || a === "combo") return false;
  return SPORT_ACTION_CLASSES[sport].includes(a as AtlantActionClass);
}
