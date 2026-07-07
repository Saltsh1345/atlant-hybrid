"use client";

import type { ReactNode } from "react";
import type { AppPhase } from "@/types";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import "@/app/dashboard-ref.css";

const SIDEBAR: {
  icon: string;
  title: string;
  phase: AppPhase;
  focusSport?: boolean;
}[] = [
  { icon: "🏠", title: "Главная", phase: "welcome" },
  { icon: "📊", title: "Дашборд", phase: "dashboard" },
  { icon: "🏋️", title: "Тренировка", phase: "dashboard", focusSport: true },
  { icon: "🧬", title: "Скан тела", phase: "calibration" },
  { icon: "⚙️", title: "Настройки", phase: "settings" },
];

export default function DashboardShell({
  userName,
  geminiOk,
  children,
  onNav,
}: {
  userName: string;
  geminiOk: boolean | null;
  children: ReactNode;
  onNav: (phase: AppPhase, opts?: { focusSport?: boolean }) => void;
}) {
  const setFocusSportPicker = useDashboardLayoutStore((s) => s.setFocusSportPicker);

  const go = (phase: AppPhase, focusSport?: boolean) => {
    if (focusSport) {
      setFocusSportPicker(true);
      onNav("dashboard", { focusSport: true });
      return;
    }
    setFocusSportPicker(false);
    onNav(phase);
  };

  return (
    <div className="dashboard-ref flex min-h-dvh">
      <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--dash-sidebar)] py-6 lg:flex xl:w-20">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-lg text-white shadow-md">
          A
        </div>
        {SIDEBAR.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => go(item.phase, item.focusSport)}
            className="group flex w-full flex-col items-center gap-0.5 px-1 py-2.5 text-[9px] text-[var(--dash-muted)] transition hover:text-[var(--primary)]"
            title={item.title}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition group-hover:bg-[var(--primary-muted)]">
              {item.icon}
            </span>
            <span className="max-w-[64px] truncate text-center leading-tight">
              {item.title}
            </span>
          </button>
        ))}
      </aside>

      <div className="min-w-0 flex-1 px-4 py-5 lg:px-6 xl:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Atlant Hybrid
            </p>
            <h1 className="text-2xl font-bold text-[var(--dash-text)]">{userName}</h1>
            <p className="text-xs text-[var(--dash-muted)]">
              Модульный дашборд · перетаскивайте виджеты в режиме редактирования
            </p>
          </div>
          {geminiOk !== null && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-[10px] text-[var(--muted)]">
              Gemini {geminiOk ? "ON" : "local"}
            </span>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
