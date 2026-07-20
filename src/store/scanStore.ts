"use client";

import { create } from "zustand";
import type { StageTwoScanResult } from "@/lib/scan/scanResult";

export type ScanPhase =
  | "height"
  | "front"
  | "side"
  | "processing"
  | "complete"
  | "error";

interface ScanStore {
  phase: ScanPhase;
  statureCm: number | null;
  result: StageTwoScanResult | null;
  error: string | null;
  saving: boolean;
  setPhase: (phase: ScanPhase) => void;
  setStatureCm: (statureCm: number) => void;
  setResult: (result: StageTwoScanResult) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useScanStore = create<ScanStore>((set) => ({
  phase: "height",
  statureCm: null,
  result: null,
  error: null,
  saving: false,
  setPhase: (phase) => set({ phase, error: null }),
  setStatureCm: (statureCm) => set({ statureCm }),
  setResult: (result) => set({ result, phase: "complete", error: null }),
  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error, phase: "error", saving: false }),
  reset: () =>
    set({
      phase: "height",
      statureCm: null,
      result: null,
      error: null,
      saving: false,
    }),
}));
