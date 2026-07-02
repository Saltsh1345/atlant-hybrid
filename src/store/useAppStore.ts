import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppPhase,
  CalibrationStep,
  Sport,
  StrengthExercise,
  UserProfile,
  LatchedBodyData,
  LiveKinematics,
  KinematicSample,
  SessionSummary,
  TrackingMode,
} from "@/types";
import { canTransition, trackingModeForPhase } from "@/lib/stateMachine";
import { simulateBodyComposition } from "@/lib/calibration/bodySimulator";
import type { ScanAnalysis } from "@/lib/calibration/scanAnalysis";
import { setVoiceMuted as applyVoiceMuted } from "@/lib/ai/speech";

const DEFAULT_KINEMATICS: LiveKinematics = {
  bpm: 72,
  velocityMs: 0,
  powerW: 0,
  fatiguePercent: 0,
  kneeAngle: 180,
  backAngle: 170,
  elbowAngle: 170,
  wristVelocityMs: 0,
  punchSpeedMs: null,
  spineFlexion: 0,
};

interface AppStore {
  phase: AppPhase;
  calibrationStep: CalibrationStep;
  trackingMode: TrackingMode;

  profile: UserProfile | null;

  /** DATA LATCH — written once, never auto-updated */
  latchedBody: LatchedBodyData | null;
  bodyDataLocked: boolean;

  selectedSport: Sport | null;
  selectedExercise: StrengthExercise | null;
  kinematics: LiveKinematics;
  sessionSamples: KinematicSample[];
  sessionStartTime: number | null;
  lastSession: SessionSummary | null;
  sessionHistory: SessionSummary[];

  avatarMissing: boolean;
  calibrationScriptIndex: number;
  voiceMuted: boolean;
  rescanPending: boolean;

  setPhase: (phase: AppPhase) => boolean;
  setProfile: (profile: UserProfile) => void;
  setCalibrationStep: (step: CalibrationStep) => void;
  advanceCalibrationScript: () => void;

  /** ONE-TIME latch — refuses if already locked */
  latchBodyData: (scan?: ScanAnalysis | null) => LatchedBodyData | null;

  setSelectedSport: (sport: Sport) => void;
  setSelectedExercise: (exercise: StrengthExercise) => void;
  updateKinematics: (k: LiveKinematics) => void;
  pushSample: (sample: KinematicSample) => void;
  startSession: () => void;
  endSession: (
    analysis: string,
    stats?: {
      reps?: number;
      punches?: number;
      swings?: number;
      formScore?: number;
      peakVelocity?: number;
    }
  ) => SessionSummary | null;
  setAvatarMissing: (v: boolean) => void;
  resetCalibration: () => void;
  unlockForRescan: () => void;
  requestRescan: () => void;
  clearRescanPending: () => void;
  setVoiceMuted: (muted: boolean) => void;
  resetAllData: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      phase: "welcome",
      calibrationStep: "idle",
      trackingMode: "idle",
      profile: null,
      latchedBody: null,
      bodyDataLocked: false,
      selectedSport: null,
      selectedExercise: null,
      kinematics: DEFAULT_KINEMATICS,
      sessionSamples: [],
      sessionStartTime: null,
      lastSession: null,
      sessionHistory: [],
      avatarMissing: false,
      calibrationScriptIndex: 0,
      voiceMuted: false,
      rescanPending: false,

      setPhase: (phase) => {
        const current = get().phase;
        if (!canTransition(current, phase)) return false;
        set({
          phase,
          trackingMode: trackingModeForPhase(phase),
        });
        return true;
      },

      setProfile: (profile) => set({ profile }),

      setCalibrationStep: (step) => set({ calibrationStep: step }),

      advanceCalibrationScript: () =>
        set((s) => ({ calibrationScriptIndex: s.calibrationScriptIndex + 1 })),

      latchBodyData: (scan) => {
        if (get().bodyDataLocked) return get().latchedBody;
        const profile = get().profile;
        if (!profile) return null;
        const latched = simulateBodyComposition(profile, scan);
        set({ latchedBody: latched, bodyDataLocked: true });
        return latched;
      },

      setSelectedSport: (sport) =>
        set({ selectedSport: sport, selectedExercise: null }),

      setSelectedExercise: (exercise) => set({ selectedExercise: exercise }),

      updateKinematics: (kinematics) => {
        if (get().trackingMode !== "continuous") return;
        set({ kinematics });
      },

      pushSample: (sample) => {
        if (get().trackingMode !== "continuous") return;
        set((s) => ({
          sessionSamples: [...s.sessionSamples.slice(-200), sample],
        }));
      },

      startSession: () =>
        set({
          sessionSamples: [],
          sessionStartTime: Date.now(),
          kinematics: DEFAULT_KINEMATICS,
        }),

      endSession: (aiAnalysis, stats) => {
        const {
          selectedSport,
          selectedExercise,
          sessionSamples,
          sessionStartTime,
        } = get();
        if (!selectedSport || !sessionStartTime) return null;

        const velocities = sessionSamples.map((s) => s.velocityMs);
        const punches = sessionSamples.map((s) => s.wristVelocityMs);
        const summary: SessionSummary = {
          sport: selectedSport,
          durationSec: Math.round((Date.now() - sessionStartTime) / 1000),
          avgVelocity:
            velocities.length > 0
              ? Math.round(
                  (velocities.reduce((a, b) => a + b, 0) / velocities.length) *
                    100
                ) / 100
              : 0,
          peakPunchSpeed: Math.round(Math.max(...punches, 0) * 100) / 100,
          reps: stats?.reps,
          punches: stats?.punches,
          swings: stats?.swings,
          exercise: selectedExercise ?? undefined,
          formScore: stats?.formScore,
          peakVelocity: stats?.peakVelocity,
          samples: sessionSamples,
          aiAnalysis,
          completedAt: new Date().toISOString(),
        };
        set((s) => ({
          lastSession: summary,
          sessionStartTime: null,
          sessionHistory: [summary, ...s.sessionHistory].slice(0, 20),
        }));
        return summary;
      },

      setAvatarMissing: (avatarMissing) => set({ avatarMissing }),

      resetCalibration: () =>
        set({
          calibrationStep: "idle",
          calibrationScriptIndex: 0,
          trackingMode: "calibration",
        }),

      unlockForRescan: () =>
        set({ bodyDataLocked: false, latchedBody: null }),

      requestRescan: () => set({ rescanPending: true }),

      clearRescanPending: () => set({ rescanPending: false }),

      setVoiceMuted: (muted) => {
        applyVoiceMuted(muted);
        set({ voiceMuted: muted });
      },

      resetAllData: () => {
        applyVoiceMuted(false);
        set({
          phase: "welcome",
          profile: null,
          latchedBody: null,
          bodyDataLocked: false,
          lastSession: null,
          sessionHistory: [],
          voiceMuted: false,
        });
      },
    }),
    {
      name: "atlant-hybrid-store-v2",
      partialize: (s) => ({
        profile: s.profile,
        latchedBody: s.latchedBody,
        bodyDataLocked: s.bodyDataLocked,
        lastSession: s.lastSession,
        sessionHistory: s.sessionHistory,
        voiceMuted: s.voiceMuted,
        phase:
          s.phase === "training" ||
          s.phase === "settings" ||
          s.phase === "twin-live"
            ? "dashboard"
            : s.phase,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.voiceMuted) applyVoiceMuted(true);
      },
    }
  )
);
