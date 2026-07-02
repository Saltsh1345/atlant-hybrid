"use client";

import dynamic from "next/dynamic";
import type { AvatarViewerInnerProps } from "@/components/three/AvatarViewerInner";

function ViewerSkeleton({ tall, compact }: { tall?: boolean; compact?: boolean }) {
  const heightClass = compact ? "h-32" : tall ? "h-52" : "h-48";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 ${heightClass}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    </div>
  );
}

const AvatarViewerInner = dynamic(
  () => import("@/components/three/AvatarViewerInner"),
  {
    ssr: false,
    loading: () => <ViewerSkeleton />,
  }
);

export type { AvatarModelKind } from "@/components/three/AvatarViewerInner";

export default function AvatarViewer(props: AvatarViewerInnerProps) {
  return <AvatarViewerInner {...props} />;
}
