"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";

/** Legacy route — redirects to dashboard with sport picker focused */
export default function SportSelectScreen() {
  const setPhase = useAppStore((s) => s.setPhase);
  const setFocusSportPicker = useDashboardLayoutStore((s) => s.setFocusSportPicker);

  useEffect(() => {
    useAppStore.getState().ensureProfile();
    setFocusSportPicker(true);
    setPhase("dashboard");
  }, [setPhase, setFocusSportPicker]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
      Переход на дашборд…
    </div>
  );
}
