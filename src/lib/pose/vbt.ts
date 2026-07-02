import type { NormalizedLandmark, LiveKinematics } from "@/types";
import { LM, avg, angle, dist } from "./landmarks";

interface VelocityState {
  prevWrist: NormalizedLandmark | null;
  prevKnee: NormalizedLandmark | null;
  prevTime: number;
  velocityHistory: number[];
  peakPunch: number;
  peakVelocity: number;
}

const state: VelocityState = {
  prevWrist: null,
  prevKnee: null,
  prevTime: 0,
  velocityHistory: [],
  peakPunch: 0,
  peakVelocity: 0,
};

export function resetVbtState(): void {
  state.prevWrist = null;
  state.prevKnee = null;
  state.prevTime = 0;
  state.velocityHistory = [];
  state.peakPunch = 0;
  state.peakVelocity = 0;
}

export function getPeakVelocity(): number {
  return Math.round(state.peakVelocity * 100) / 100;
}

export function getPeakPunchSpeed(): number {
  return state.peakPunch;
}

/**
 * Continuous kinematics only — NO body composition here.
 */
export function computeKinematics(
  landmarks: NormalizedLandmark[],
  sport: "strength" | "boxing" | "tennis",
  heightCm: number
): LiveKinematics {
  const now = performance.now();
  const dt = state.prevTime ? (now - state.prevTime) / 1000 : 0;
  state.prevTime = now;

  const hip = avg(landmarks[LM.L_HIP], landmarks[LM.R_HIP]);
  const knee = avg(landmarks[LM.L_KNEE], landmarks[LM.R_KNEE]);
  const ankle = avg(landmarks[LM.L_ANKLE], landmarks[LM.R_ANKLE]);
  const shoulder = avg(landmarks[LM.L_SHOULDER], landmarks[LM.R_SHOULDER]);
  const lWrist = landmarks[LM.L_WRIST];
  const rWrist = landmarks[LM.R_WRIST];
  const wrist =
    (lWrist.visibility ?? 0) > (rWrist.visibility ?? 0) ? lWrist : rWrist;

  const lElbow = landmarks[LM.L_ELBOW];
  const rElbow = landmarks[LM.R_ELBOW];
  const lShoulder = landmarks[LM.L_SHOULDER];
  const rShoulder = landmarks[LM.R_SHOULDER];

  const kneeAngle = angle(hip, knee, ankle);
  const backAngle = angle(shoulder, hip, knee);
  const spineFlexion = 180 - angle(shoulder, hip, ankle);

  const useLeftArm =
    (lWrist.visibility ?? 0) + (lElbow.visibility ?? 0) >
    (rWrist.visibility ?? 0) + (rElbow.visibility ?? 0);
  const elbowAngle = useLeftArm
    ? angle(lShoulder, lElbow, lWrist)
    : angle(rShoulder, rElbow, rWrist);

  let wristVelocityMs = 0;
  let punchSpeedMs: number | null = null;

  if (state.prevWrist && dt > 0) {
    const pxPerSec = dist(wrist, state.prevWrist) / dt;
    const scale = (heightCm / 100) * 0.85;
    wristVelocityMs = pxPerSec * scale;

    if (sport === "boxing" && wristVelocityMs > 2.5) {
      punchSpeedMs = wristVelocityMs;
      state.peakPunch = Math.max(state.peakPunch, wristVelocityMs);
    }
  }
  state.prevWrist = { ...wrist };

  let velocityMs = wristVelocityMs;
  if (sport === "strength" && state.prevKnee && dt > 0) {
    velocityMs = (dist(knee, state.prevKnee) / dt) * (heightCm / 100);
  }
  state.prevKnee = { ...knee };

  state.velocityHistory.push(velocityMs);
  if (state.velocityHistory.length > 30) state.velocityHistory.shift();
  state.peakVelocity = Math.max(state.peakVelocity, velocityMs);

  const avgVel =
    state.velocityHistory.reduce((a, b) => a + b, 0) /
    Math.max(1, state.velocityHistory.length);
  const peak = Math.max(...state.velocityHistory, 0.01);
  const fatiguePercent = Math.round(
    Math.max(0, Math.min(100, (1 - avgVel / peak) * 100))
  );

  const powerW = Math.round(velocityMs * 120 + kneeAngle * 2);
  const bpm = Math.round(72 + velocityMs * 18 + fatiguePercent * 0.3);

  return {
    bpm: Math.min(185, bpm),
    velocityMs: Math.round(velocityMs * 100) / 100,
    powerW,
    fatiguePercent,
    kneeAngle: Math.round(kneeAngle),
    backAngle: Math.round(backAngle),
    elbowAngle: Math.round(elbowAngle),
    wristVelocityMs: Math.round(wristVelocityMs * 100) / 100,
    punchSpeedMs: punchSpeedMs
      ? Math.round(punchSpeedMs * 100) / 100
      : null,
    spineFlexion: Math.round(spineFlexion),
  };
}
