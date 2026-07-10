"use client";

import type { CalibrationStep } from "@/types";

export default function PhoneVoiceScanOverlay({
  step,
  stepIndex,
  stepTotal,
  instruction,
  status,
  voiceOnly,
}: {
  step: CalibrationStep;
  stepIndex: number;
  stepTotal: number;
  instruction: string;
  status: string;
  voiceOnly: boolean;
}) {
  if (!voiceOnly) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[38] flex flex-col justify-between bg-black/55 px-4 py-6">
      <div className="rounded-2xl border border-white/20 bg-black/70 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
          Голосовой скан · шаг {stepIndex + 1} из {stepTotal}
        </p>
        <p className="mt-2 text-lg font-bold leading-snug text-white sm:text-xl">
          {instruction}
        </p>
        {status && (
          <p className="mt-2 text-sm font-medium text-emerald-300">{status}</p>
        )}
      </div>
      <p className="text-center text-[11px] text-slate-400">
        Экран не обязателен — слушайте голос. Шаг: {step}
      </p>
    </div>
  );
}
