import type { AppPhase, TrackingMode } from "@/types";

const TRANSITIONS: Record<AppPhase, AppPhase[]> = {
  welcome: ["registration", "sport-select", "calibration", "dashboard", "training"],
  registration: ["dashboard", "welcome"],
  dashboard: ["calibration", "sport-select", "settings", "twin-live", "welcome", "training"],
  "twin-live": ["dashboard"],
  settings: ["dashboard", "registration"],
  calibration: ["sport-select", "dashboard", "welcome"],
  "sport-select": ["training", "welcome", "dashboard"],
  training: ["analysis"],
  analysis: ["dashboard", "sport-select", "training"],
};

export function canTransition(from: AppPhase, to: AppPhase): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function trackingModeForPhase(phase: AppPhase): TrackingMode {
  if (phase === "calibration") return "calibration";
  if (phase === "training") return "continuous";
  return "idle";
}
