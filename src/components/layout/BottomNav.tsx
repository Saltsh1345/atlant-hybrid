"use client";

import { useAppStore } from "@/store/useAppStore";
import type { AppPhase } from "@/types";

const NAV: { phase: AppPhase; label: string; icon: string }[] = [
  { phase: "welcome", label: "Главная", icon: "🏠" },
  { phase: "dashboard", label: "Дашборд", icon: "📊" },
  { phase: "sport-select", label: "Тренировка", icon: "🏋️" },
  { phase: "settings", label: "Настройки", icon: "⚙️" },
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

  if (!VISIBLE_ON.includes(phase)) return null;

  const go = (target: AppPhase) => {
    if (target === "sport-select") {
      useAppStore.getState().ensureProfile();
    }
    setPhase(target);
  };

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg">
        {NAV.map((item) => {
          const active = phase === item.phase;
          return (
            <button
              key={item.phase}
              type="button"
              onClick={() => go(item.phase)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-[10px] transition ${
                active
                  ? "text-primary"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
