"use client";

import { useAppStore } from "@/store/useAppStore";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import type { AppPhase } from "@/types";
import AppIcon, { type AppIconName } from "@/components/ui/AppIcon";

type NavItem = {
  id: string;
  phase: AppPhase;
  label: string;
  icon: AppIconName;
  focusSport?: boolean;
};

const NAV: NavItem[] = [
  { id: "dash", phase: "dashboard", label: "Обзор", icon: "overview" },
  {
    id: "train",
    phase: "dashboard",
    label: "Тренировки",
    icon: "bolt",
    focusSport: true,
  },
  { id: "scan", phase: "calibration", label: "Скан", icon: "body" },
  { id: "twin", phase: "twin-live", label: "Двойник", icon: "twin" },
  { id: "settings", phase: "settings", label: "Настройки", icon: "settings" },
];

const VISIBLE_ON: AppPhase[] = [
  "welcome",
  "dashboard",
  "sport-select",
  "settings",
];

export default function BottomNav() {
  const phase = useAppStore((s) => s.phase);
  const setPhase = useAppStore((s) => s.setPhase);
  const bodyDataLocked = useAppStore((s) => s.bodyDataLocked);
  const requestRescan = useAppStore((s) => s.requestRescan);
  const setFocusSportPicker = useDashboardLayoutStore((s) => s.setFocusSportPicker);

  if (!VISIBLE_ON.includes(phase)) return null;

  const go = (item: NavItem) => {
    if (item.focusSport) {
      useAppStore.getState().ensureProfile();
      setFocusSportPicker(true);
      setPhase("sport-select");
      return;
    }
    setFocusSportPicker(false);
    if (item.phase === "settings") {
      useAppStore.getState().ensureProfile();
    }
    if (item.phase === "calibration") {
      if (bodyDataLocked) requestRescan();
      setPhase("calibration");
      return;
    }
    if (item.phase === "twin-live") {
      if (!bodyDataLocked) {
        setPhase("calibration");
        return;
      }
      setPhase("twin-live");
      return;
    }
    setPhase(item.phase);
  };

  const isActive = (item: NavItem) => {
    if (item.focusSport) return phase === "dashboard" || phase === "sport-select";
    return phase === item.phase;
  };

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] transition ${
                active
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="text-lg">
                <AppIcon name={item.icon} className="h-5 w-5" />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
