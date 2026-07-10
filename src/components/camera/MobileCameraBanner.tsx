"use client";

import type { MobileCameraCapabilities } from "@/lib/camera/mobileCamera";

export default function MobileCameraBanner({
  caps,
}: {
  caps: MobileCameraCapabilities;
}) {
  if (caps.kind === "laptop") return null;

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">
      <p className="font-semibold text-cyan-300">
        {caps.label} · режим видеодиагностики
      </p>
      <p className="mt-0.5 text-cyan-100/90">
        {caps.scanFacing === "environment"
          ? "Задняя камера · полный рост 1.5–2.5 м"
          : "Фронтальная камера"}
        {" · "}
        до {caps.idealWidth}×{caps.idealHeight}
      </p>
      {caps.depthTier !== "none" && (
        <p className="mt-1 text-[10px] text-amber-200/80">
          LiDAR/ToF в железе есть — в браузере глубина через позу и калибровку
        </p>
      )}
    </div>
  );
}
