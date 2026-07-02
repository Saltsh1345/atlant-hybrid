import type { AppPhase, TrackingMode } from "@/types";

const TRANSITIONS: Record<AppPhase, AppPhase[]> = {
  welcome: ["registration"],
  registration: ["dashboard"],
  dashboard: ["calibration", "sport-select", "settings", "twin-live"],
  "twin-live": ["dashboard"],
  settings: ["dashboard", "registration"],
  calibration: ["sport-select", "dashboard"],
  "sport-select": ["training"],
  training: ["analysis"],
  analysis: ["dashboard", "sport-select"],
};

export function canTransition(from: AppPhase, to: AppPhase): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function trackingModeForPhase(phase: AppPhase): TrackingMode {
  if (phase === "calibration") return "calibration";
  if (phase === "training") return "continuous";
  return "idle";
}
