"use client";

import { getCalibrationScript } from "@/lib/calibration/script";
import { detectDeviceKind } from "@/lib/camera/deviceProfile";
import type { CalibrationStep } from "@/types";

export default function CalibrationProgress({
  current,
}: {
  current: CalibrationStep;
}) {
  if (current === "idle") return null;
  const steps = getCalibrationScript(detectDeviceKind()).map((s) => s.step);
  const idx = steps.indexOf(current);
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / steps.length) * 100);

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
