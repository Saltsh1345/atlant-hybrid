import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DashboardLayoutStore {
  focusSportPicker: boolean;
  setFocusSportPicker: (v: boolean) => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutStore>()(
  persist(
    (set) => ({
      focusSportPicker: false,
      setFocusSportPicker: (focusSportPicker) => set({ focusSportPicker }),
    }),
    {
      name: "atlant-dashboard-layout-v4",
      partialize: (s) => ({ focusSportPicker: s.focusSportPicker }),
      version: 4,
    }
  )
);
