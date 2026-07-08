"use client";

import DigitalTwinCard from "@/components/dashboard/DigitalTwinCard";
import AppIcon from "@/components/ui/AppIcon";
import type { LatchedBodyData, SessionSummary } from "@/types";

export type SensorStatus = "live" | "ok" | "warn" | "off";

export interface SensorChip {
  id: string;
  label: string;
  detail: string;
  status: SensorStatus;
}

function statusColor(s: SensorStatus) {
  switch (s) {
    case "live":
    case "ok":
      return "bg-[var(--neon-lime,#ccff00)]";
    case "warn":
      return "bg-[#f59e0b]";
    default:
      return "bg-[#737373]";
  }
}

function statusLabel(s: SensorStatus) {
  switch (s) {
    case "live":
      return "LIVE";
    case "ok":
      return "OK";
    case "warn":
      return "WAIT";
    default:
      return "OFF";
  }
}

export default function ApexTwinScanPanel({
  bodyDataLocked,
  latchedBody,
  lastSession,
  sensors,
  onScan,
  onOpenLive,
}: {
  bodyDataLocked: boolean;
  latchedBody: LatchedBodyData | null;
  lastSession: SessionSummary | null;
  sensors: SensorChip[];
  onScan: () => void;
  onOpenLive?: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#141414]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
              Биомеханика
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Цифровой двойник</h2>
          </div>
          <div className="flex items-center gap-2 text-[var(--neon-lime,#ccff00)]">
            <AppIcon name="twin" className="h-4 w-4" />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {bodyDataLocked ? "ГОТОВ" : "ПРЕВЬЮ"}
            </span>
          </div>
        </div>
        <div className="min-h-[320px] p-3 md:p-4">
          <DigitalTwinCard
            bodyDataLocked={bodyDataLocked}
            latchedBody={latchedBody}
            lastSession={lastSession}
            onScan={onScan}
            onOpenLive={onOpenLive}
            calm
            className="!min-h-[300px] !border-0 !bg-transparent !p-0 !shadow-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
                Биоскан
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Сканирование тела</h2>
            </div>
            <AppIcon name="body" className="h-5 w-5 text-[var(--neon-lime,#ccff00)]" />
          </div>

          {bodyDataLocked && latchedBody ? (
            <>
              <p className="mb-4 text-sm text-[#a3a3a3]">
                Состав зафиксирован{" "}
                {new Date(latchedBody.lockedAt).toLocaleDateString("ru-RU")}
                {latchedBody.source === "gemini" ? " · Gemini" : " · локально"}
              </p>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/4 px-2 py-3 text-center">
                  <p className="text-[9px] uppercase text-[#f59e0b]">Жир</p>
                  <p className="text-lg font-bold text-white">{latchedBody.fatPercent}%</p>
                </div>
                <div className="rounded-xl bg-white/4 px-2 py-3 text-center">
                  <p className="text-[9px] uppercase text-[var(--neon-lime,#ccff00)]">Мышцы</p>
                  <p className="text-lg font-bold text-white">{latchedBody.musclePercent}%</p>
                </div>
                <div className="rounded-xl bg-white/4 px-2 py-3 text-center">
                  <p className="text-[9px] uppercase text-[#2dd4bf]">Сухая</p>
                  <p className="text-lg font-bold text-white">{latchedBody.leanMassKg}</p>
                  <p className="text-[10px] text-[#737373]">кг</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onScan}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
              >
                Пересканировать
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-[#a3a3a3]">
                Камера + поза → фиксация жира, мышц и осанки. Без скана двойник
                работает в режиме превью.
              </p>
              <ul className="mb-5 space-y-2 text-xs text-[#a3a3a3]">
                <li className="flex items-center gap-2">
                  <AppIcon name="pulse" className="h-3.5 w-3.5 text-[var(--neon-lime,#ccff00)]" />
                  MediaPipe Pose — датчик скелета
                </li>
                <li className="flex items-center gap-2">
                  <AppIcon name="body" className="h-3.5 w-3.5 text-[var(--neon-lime,#ccff00)]" />
                  Состав тела · жир / мышцы
                </li>
                <li className="flex items-center gap-2">
                  <AppIcon name="activity" className="h-3.5 w-3.5 text-[var(--neon-lime,#ccff00)]" />
                  Постура и зоны нагрузки
                </li>
              </ul>
              <button
                type="button"
                onClick={onScan}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--neon-lime,#ccff00)] py-3 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:brightness-110"
              >
                <AppIcon name="body" className="h-4 w-4" />
                Запустить скан
              </button>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
            Датчики
          </p>
          <div className="space-y-3">
            {sensors.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{s.label}</p>
                  <p className="truncate text-[11px] text-[#737373]">{s.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${statusColor(s.status)} ${
                      s.status === "live" ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="font-mono text-[10px] text-[#a3a3a3]">
                    {statusLabel(s.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
