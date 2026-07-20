"use client";

import dynamic from "next/dynamic";
import type { MuscleMeshName } from "@/lib/three/muscleGroups";
import { AvatarErrorBoundary } from "@/components/three/AvatarErrorBoundary";
import type { AtlasVisualizationInput } from "@/types/atlas";

const AtlasScene = dynamic(() => import("@/components/atlas/AtlasScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[15rem] place-items-center rounded-2xl bg-[#04070d]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
    </div>
  ),
});

export interface AtlasViewerProps {
  input: AtlasVisualizationInput;
  variant?: "full" | "mini";
  interactive?: boolean;
  modelUrl?: string;
  className?: string;
  onZoneSelect?: (zone: MuscleMeshName | null) => void;
}

export default function AtlasViewer({
  input,
  variant = "full",
  interactive = true,
  modelUrl = "/avatar.glb",
  className = "",
  onZoneSelect,
}: AtlasViewerProps) {
  return (
    <div
      className={`relative min-h-[15rem] overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#04070d] ${className}`}
    >
      <AvatarErrorBoundary
        fallback={
          <div className="grid h-full min-h-[15rem] place-items-center p-5 text-center text-xs text-amber-200">
            Не удалось загрузить 3D-атлас. Проверьте public/avatar.glb.
          </div>
        }
      >
        <AtlasScene
          input={input}
          variant={variant}
          interactive={interactive}
          modelUrl={modelUrl}
          onZoneSelect={onZoneSelect}
        />
      </AvatarErrorBoundary>
    </div>
  );
}
