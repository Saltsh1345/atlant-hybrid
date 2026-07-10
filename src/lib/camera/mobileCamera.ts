import {
  detectDeviceKind,
  deviceCameraProfile,
  type DeviceKind,
  type CameraFacing,
} from "@/lib/camera/deviceProfile";

export type MobileDepthTier = "none" | "stereo" | "lidar_native";

export interface MobileCameraCapabilities {
  kind: DeviceKind;
  label: string;
  /** Предпочтительная камера для биоскана */
  scanFacing: CameraFacing;
  /** Предпочтительная для тренировки (зеркало) */
  trainingFacing: CameraFacing;
  idealWidth: number;
  idealHeight: number;
  idealFps: number;
  scanDistanceMinM: number;
  scanDistanceMaxM: number;
  scanDistanceIdealM: number;
  fullBodyRequired: boolean;
  depthTier: MobileDepthTier;
  features: string[];
  limitations: string[];
}

/**
 * LiDAR / ToF не доступны в PWA через getUserMedia — только в нативных ARKit/ARCore приложениях.
 * В браузере используем: высокое разрешение, заднюю камеру, полный рост, стерео-оценку глубины по позе.
 */
export function detectMobileCameraCapabilities(): MobileCameraCapabilities {
  const kind = detectDeviceKind();
  const profile = deviceCameraProfile(kind);
  const isMobile = kind === "phone" || kind === "tablet";

  const ua =
    typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isIphone = /iphone|ipad/.test(ua);
  const isAndroid = /android/.test(ua);

  let depthTier: MobileDepthTier = "none";
  const features: string[] = [
    "MediaPipe Pose 33 точки",
    "VBT по скорости суставов",
    "Gemini vision по кадрам",
  ];
  const limitations: string[] = [];

  if (isMobile) {
    features.push(
      "Задняя камера 1080p+",
      "Полный рост 1.5–2.5 м",
      "Автоэкспозиция / HDR сенсора",
      "Переключение фронт/тыл"
    );
    if (isIphone) {
      depthTier = "lidar_native";
      limitations.push(
        "LiDAR есть в железе, но в браузере недоступен — глубина через позу + калибровку"
      );
    } else if (isAndroid) {
      depthTier = "stereo";
      limitations.push(
        "ToF/стерео в нативных камерах — в PWA не отдаётся, используем монокулярную геометрию"
      );
    }
  } else {
    limitations.push(
      "Веб-камера ноутбука: ближний план торса, без LiDAR"
    );
  }

  if (isMobile) {
    return {
      kind,
      label: profile.label,
      scanFacing: "environment",
      trainingFacing: "user",
      idealWidth: kind === "phone" ? 1920 : 1920,
      idealHeight: kind === "phone" ? 1080 : 1080,
      idealFps: 30,
      scanDistanceMinM: 1.4,
      scanDistanceMaxM: 2.8,
      scanDistanceIdealM: 2.0,
      fullBodyRequired: true,
      depthTier,
      features,
      limitations,
    };
  }

  return {
    kind: "laptop",
    label: profile.label,
    scanFacing: "user",
    trainingFacing: "user",
    idealWidth: 1280,
    idealHeight: 720,
    idealFps: 30,
    scanDistanceMinM: 0.55,
    scanDistanceMaxM: 0.8,
    scanDistanceIdealM: 0.65,
    fullBodyRequired: false,
    depthTier: "none",
    features: [
      ...features,
      "MateBook калибровка 60–70 см",
      "Силуэт торса + руки",
    ],
    limitations,
  };
}

export function buildVideoConstraints(
  facing: CameraFacing,
  caps?: MobileCameraCapabilities
): MediaTrackConstraints {
  const c = caps ?? detectMobileCameraCapabilities();
  return {
    facingMode: { ideal: facing },
    width: { ideal: c.idealWidth, min: 640 },
    height: { ideal: c.idealHeight, min: 480 },
    frameRate: { ideal: c.idealFps, max: 60 },
  };
}

export function isMobileDevice(): boolean {
  const k = detectDeviceKind();
  return k === "phone" || k === "tablet";
}
