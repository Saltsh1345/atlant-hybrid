"use client";

import type { CameraFacing } from "@/lib/camera/deviceProfile";

export default function CameraFacingToggle({
  facing,
  canSwitch,
  onToggle,
}: {
  facing: CameraFacing;
  canSwitch: boolean;
  onToggle: () => void;
}) {
  if (!canSwitch) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="pointer-events-auto absolute right-3 top-3 z-[35] rounded-full border border-white/25 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm active:scale-95"
      aria-label="Переключить камеру"
    >
      {facing === "user" ? "📷 Передняя" : "📷 Задняя"}
    </button>
  );
}
