"use client";

import { CALIBRATION_SCRIPT } from "@/lib/calibration/script";
import type { CalibrationStep } from "@/types";

const STEPS = CALIBRATION_SCRIPT.map((s) => s.step);

export default function CalibrationProgress({
  current,
}: {
  current: CalibrationStep;
}) {
  if (current === "idle") return null;
  const idx = STEPS.indexOf(current);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / STEPS.length) * 100);

  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-[10px] text-slate-300">
        <span>Сканирование</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-sky-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
