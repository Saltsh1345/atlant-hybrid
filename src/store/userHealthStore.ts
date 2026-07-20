"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HealthMetricsSnapshot } from "@/types";

export interface UserHealthProfile {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  restingHeartRateBpm: number | null;
  bodyFatPercentage: number | null;
}

export type HealthSyncStatus =
  | "idle"
  | "syncing"
  | "authenticated"
  | "synced"
  | "error";

interface UserHealthStore {
  profile: UserHealthProfile;
  healthConnected: boolean;
  status: HealthSyncStatus;
  error: string | null;
  syncedAt: string | null;
  setProfile: (profile: Partial<UserHealthProfile>) => void;
  applyHuaweiMetrics: (metrics: HealthMetricsSnapshot) => void;
  setHealthConnected: (connected: boolean) => void;
  setStatus: (status: HealthSyncStatus, error?: string | null) => void;
  reset: () => void;
}

const EMPTY_PROFILE: UserHealthProfile = {
  userId: null,
  email: null,
  displayName: null,
  weightKg: null,
  heightCm: null,
  age: null,
  restingHeartRateBpm: null,
  bodyFatPercentage: null,
};

function finiteOrNull(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
}

export const useUserHealthStore = create<UserHealthStore>()(
  persist(
    (set) => ({
      profile: EMPTY_PROFILE,
      healthConnected: false,
      status: "idle",
      error: null,
      syncedAt: null,
      setProfile: (profile) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...profile,
            weightKg:
              profile.weightKg === undefined
                ? state.profile.weightKg
                : finiteOrNull(profile.weightKg, 20, 400),
            heightCm:
              profile.heightCm === undefined
                ? state.profile.heightCm
                : finiteOrNull(profile.heightCm, 80, 250),
            age:
              profile.age === undefined
                ? state.profile.age
                : finiteOrNull(profile.age, 13, 120),
            restingHeartRateBpm:
              profile.restingHeartRateBpm === undefined
                ? state.profile.restingHeartRateBpm
                : finiteOrNull(profile.restingHeartRateBpm, 25, 240),
            bodyFatPercentage:
              profile.bodyFatPercentage === undefined
                ? state.profile.bodyFatPercentage
                : finiteOrNull(profile.bodyFatPercentage, 1, 75),
          },
        })),
      applyHuaweiMetrics: (metrics) =>
        set((state) => ({
          profile: {
            ...state.profile,
            restingHeartRateBpm: finiteOrNull(
              metrics.heartRate?.restingBpm,
              25,
              240,
            ),
          },
          healthConnected: true,
          status: "synced",
          error: null,
          syncedAt: metrics.fetchedAt,
        })),
      setHealthConnected: (healthConnected) => set({ healthConnected }),
      setStatus: (status, error = null) => set({ status, error }),
      reset: () =>
        set({
          profile: EMPTY_PROFILE,
          healthConnected: false,
          status: "idle",
          error: null,
          syncedAt: null,
        }),
    }),
    {
      name: "atlant-user-health-v1",
      partialize: (state) => ({
        profile: state.profile,
        healthConnected: state.healthConnected,
        syncedAt: state.syncedAt,
      }),
    },
  ),
);
