"use client";

import type { CameraStatus } from "@/hooks/usePoseTracker";

interface CameraStatusOverlayProps {
  cameraStatus: CameraStatus;
  cameraError: string | null;
  poseReady: boolean;
  poseError: string | null;
}

export default function CameraStatusOverlay({
  cameraStatus,
  cameraError,
  poseReady,
  poseError,
}: CameraStatusOverlayProps) {
  if (cameraStatus === "error" && cameraError) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/90 p-6">
        <div className="health-card max-w-sm bg-white p-6 text-center">
          <p className="text-4xl">📷</p>
          <p className="mt-3 font-medium text-slate-800">{cameraError}</p>
          <p className="mt-2 text-xs text-muted">
            Обновите страницу после выдачи разрешения
          </p>
        </div>
      </div>
    );
  }

  if (poseError) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/90 p-6">
        <div className="health-card max-w-sm bg-white p-6 text-center">
          <p className="font-medium text-slate-800">{poseError}</p>
        </div>
      </div>
    );
  }

  if (cameraStatus === "loading" || !poseReady) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/70">
        <div className="health-card bg-white/95 px-6 py-4 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-700">
            {cameraStatus === "loading"
              ? "Подключение камеры..."
              : "Загрузка MediaPipe..."}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
