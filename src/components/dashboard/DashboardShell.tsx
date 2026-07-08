"use client";

import type { ReactNode } from "react";
import type { AppPhase } from "@/types";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import AppIcon, { type AppIconName } from "@/components/ui/AppIcon";
import type { OverviewData } from "@/lib/dashboard/overviewMetrics";
import "@/app/dashboard-ref.css";

const MENU: {
  icon: AppIconName;
  title: string;
  phase: AppPhase;
  focusSport?: boolean;
}[] = [
  { icon: "overview", title: "Обзор", phase: "dashboard" },
  { icon: "bolt", title: "Тренировки", phase: "dashboard", focusSport: true },
  { icon: "twin", title: "Двойник", phase: "twin-live" },
  { icon: "body", title: "Скан тела", phase: "calibration" },
  { icon: "diamond", title: "Питание", phase: "settings" },
  { icon: "triangle", title: "Прогресс", phase: "dashboard" },
];

export default function DashboardShell({
  userName,
  programLabel,
  overview,
  twinLocked,
  children,
  onNav,
  onLogWorkout,
}: {
  userName: string;
  programLabel: string;
  overview: OverviewData;
  twinLocked: boolean;
  children: ReactNode;
  onNav: (phase: AppPhase, opts?: { focusSport?: boolean }) => void;
  onLogWorkout: () => void;
}) {
  const setFocusSportPicker = useDashboardLayoutStore((s) => s.setFocusSportPicker);

  const go = (phase: AppPhase, focusSport?: boolean) => {
    if (focusSport) {
      setFocusSportPicker(true);
      onNav("sport-select" as AppPhase);
      return;
    }
    setFocusSportPicker(false);
    onNav(phase);
  };

  return (
    <div className="dashboard-ref flex min-h-dvh bg-black text-white">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/8 bg-[#0a0a0a] px-5 py-6 lg:flex">
        <div className="mb-8">
          <p className="font-mono text-sm font-bold tracking-[0.18em] text-[var(--neon-lime,#ccff00)]">
            ATLANT
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1c1c] text-[var(--neon-lime,#ccff00)] ring-1 ring-white/10">
            <AppIcon name="user" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-[11px] text-[#737373]">{programLabel}</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#737373]">
            <span>Программа</span>
            <span className="text-white">{overview.programPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--neon-lime,#ccff00)]"
              style={{ width: `${overview.programPct}%` }}
            />
          </div>
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">
          Меню
        </p>
        <nav className="mb-8 flex flex-col gap-1">
          {MENU.map((item, idx) => {
            const active = idx === 0;
            const twinDisabled = item.phase === "twin-live" && !twinLocked;
            return (
              <button
                key={item.title}
                type="button"
                disabled={false}
                onClick={() => {
                  if (twinDisabled) {
                    go("calibration");
                    return;
                  }
                  go(item.phase, item.focusSport);
                }}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-white/8 text-white"
                    : twinDisabled
                      ? "text-[#525252] hover:bg-white/5 hover:text-[#a3a3a3]"
                      : "text-[#a3a3a3] hover:bg-white/5 hover:text-white"
                }`}
                title={
                  twinDisabled
                    ? "Сначала пройдите скан тела"
                    : item.title
                }
              >
                {active && (
                  <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r bg-[var(--neon-lime,#ccff00)]" />
                )}
                <AppIcon name={item.icon} className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {item.phase === "twin-live" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      twinLocked
                        ? "bg-[var(--neon-lime,#ccff00)]"
                        : "bg-[#737373]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">
          Недавние
        </p>
        <div className="mb-auto flex flex-col gap-3">
          {overview.recent.length === 0 ? (
            <p className="text-xs text-[#737373]">Пока нет тренировок</p>
          ) : (
            overview.recent.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{item.title}</p>
                  <p className="text-[11px] text-[#737373]">{item.when}</p>
                </div>
                <p className="shrink-0 font-mono text-xs text-white/90">{item.volumeLabel}</p>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => onNav("settings")}
          className="mt-6 w-full rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10"
        >
          Перейти на PRO
        </button>
      </aside>

      <div className="min-w-0 flex-1 px-5 py-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#737373]">
              {new Date().toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white uppercase">
              Обзор
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogWorkout}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--neon-lime,#ccff00)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-black transition hover:brightness-110"
            >
              <AppIcon name="plus" className="h-4 w-4" />
              Записать тренировку
            </button>
            <button
              type="button"
              onClick={() => onNav("settings")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#141414] text-white/80 hover:text-white"
              aria-label="Профиль"
            >
              <AppIcon name="user" className="h-4 w-4" />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
