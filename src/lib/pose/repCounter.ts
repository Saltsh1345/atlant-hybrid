export type SquatPhase = "standing" | "descending" | "bottom" | "ascending";

interface RepCounterState {
  reps: number;
  phase: SquatPhase;
  bottomSeen: boolean;
  topSeen: boolean;
}

const squatState: RepCounterState = {
  reps: 0,
  phase: "standing",
  bottomSeen: false,
  topSeen: false,
};

const punchState = { count: 0, lastAt: 0 };
const swingState = { count: 0, lastAt: 0 };

export function resetRepCounter(): void {
  squatState.reps = 0;
  squatState.phase = "standing";
  squatState.bottomSeen = false;
  squatState.topSeen = false;
  punchState.count = 0;
  punchState.lastAt = 0;
  swingState.count = 0;
  swingState.lastAt = 0;
}

export function getRepCount(): number {
  return squatState.reps;
}

export function getPunchCount(): number {
  return punchState.count;
}

/** Squat / lunge: knee bottom < 105°, top > 155° */
export function updateSquatReps(kneeAngle: number): number {
  const bottom = kneeAngle < 105;
  const top = kneeAngle > 155;

  if (bottom) {
    squatState.bottomSeen = true;
    squatState.phase = "bottom";
  } else if (squatState.bottomSeen && top) {
    squatState.reps += 1;
    squatState.bottomSeen = false;
    squatState.phase = "standing";
  } else if (!bottom && !top) {
    squatState.phase = kneeAngle < 130 ? "descending" : "ascending";
  }

  return squatState.reps;
}

/** Bench: elbow flexed < 95°, extended > 155° */
export function updateBenchReps(elbowAngle: number): number {
  const flexed = elbowAngle < 95;
  const extended = elbowAngle > 155;

  if (extended) {
    squatState.topSeen = true;
  } else if (squatState.topSeen && flexed) {
    squatState.reps += 1;
    squatState.topSeen = false;
  }

  return squatState.reps;
}

/** Drill strike — requires real extension + speed (not arm waving) */
export function detectDrillStrike(
  punchSpeedMs: number | null,
  wristVelocityMs: number,
  elbowAngle: number
): number | null {
  const speed =
    punchSpeedMs ?? (wristVelocityMs > 2.1 ? wristVelocityMs : null);
  if (!speed || speed < 2.1) return null;
  if (elbowAngle < 115) return null;
  const now = Date.now();
  if (now - punchState.lastAt < 500) return null;
  punchState.lastAt = now;
  return Math.round(speed * 100) / 100;
}

/** Boxing punch / tennis swing count with cooldown */
export function updatePunchCount(
  punchSpeedMs: number | null,
  elbowAngle?: number
): number {
  if (!punchSpeedMs || punchSpeedMs < 2.7) return punchState.count;
  if (elbowAngle != null && elbowAngle < 135) return punchState.count;
  const now = Date.now();
  if (now - punchState.lastAt < 450) return punchState.count;
  punchState.lastAt = now;
  punchState.count += 1;
  return punchState.count;
}

/** Tennis drill swing — needs torso + speed */
export function detectDrillSwing(
  wristVelocityMs: number,
  spineFlexion: number,
  elbowAngle: number
): number | null {
  const torsoOk = spineFlexion >= 8 && spineFlexion <= 45;
  const armOk = elbowAngle >= 95;
  if (wristVelocityMs < 2.2 || !torsoOk || !armOk) return null;
  const now = Date.now();
  if (now - swingState.lastAt < 600) return null;
  swingState.lastAt = now;
  return Math.round(wristVelocityMs * 100) / 100;
}

/** Tennis: swing requires velocity + torso involvement. */
export function updateSwingCount(
  wristVelocityMs: number,
  spineFlexion: number,
  elbowAngle: number
): number {
  const torsoOk = spineFlexion >= 6 && spineFlexion <= 45;
  const armOk = elbowAngle >= 90;
  if (wristVelocityMs < 2.4 || !torsoOk || !armOk) return swingState.count;
  const now = Date.now();
  if (now - swingState.lastAt < 750) return swingState.count;
  swingState.lastAt = now;
  swingState.count += 1;
  return swingState.count;
}

export function getSwingCount(): number {
  return swingState.count;
}
