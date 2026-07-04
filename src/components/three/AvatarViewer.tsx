"use client";

import dynamic from "next/dynamic";
import { AvatarErrorBoundary } from "@/components/three/AvatarErrorBoundary";
import type { AvatarViewerInnerProps } from "@/components/three/AvatarViewerInner";

function ViewerSkeleton({
  tall,
  compact,
  fillHeight,
}: {
  tall?: boolean;
  compact?: boolean;
  fillHeight?: boolean;
}) {
  const heightClass = fillHeight
    ? "h-full min-h-[12rem]"
    : compact
      ? "h-32"
      : tall
        ? "h-52"
        : "h-48";
  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-cyan-50 ${heightClass}`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
    </div>
  );
}

const AvatarViewerInner = dynamic(
  () => import("@/components/three/AvatarViewerInner"),
  { ssr: false }
);

export type { AvatarModelKind } from "@/components/three/AvatarViewerInner";

export default function AvatarViewer(props: AvatarViewerInnerProps) {
  if (!props.assetReady) {
    return (
      <ViewerSkeleton
        tall={props.tall}
        compact={props.compact}
        fillHeight={props.fillHeight}
      />
    );
  }

  return (
    <AvatarErrorBoundary
      fallback={
        <div
          className={`flex w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800 ${
            props.fillHeight
              ? "h-full min-h-[12rem]"
              : props.compact
                ? "h-32"
                : "h-52"
          }`}
        >
          Не удалось загрузить 3D-аватар. Обновите страницу или проверьте
          public/avatar.glb
        </div>
      }
    >
      <AvatarViewerInner {...props} />
    </AvatarErrorBoundary>
  );
}
