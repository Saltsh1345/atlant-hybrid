export type DeviceKind = "phone" | "tablet" | "laptop";

export type CameraFacing = "user" | "environment";

export interface DeviceCameraProfile {
  kind: DeviceKind;
  label: string;
  /** Ideal shoulder width in normalized landmarks (0–1) */
  shoulderMin: number;
  shoulderMax: number;
  /** Ideal body height fraction in frame */
  bodyHeightMin: number;
  bodyHeightMax: number;
  distanceHint: string;
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function detectDeviceKind(): DeviceKind {
  if (typeof window === "undefined") return "laptop";
  const w = window.innerWidth;
  const touch = isTouchDevice();
  if (w < 640 && touch) return "phone";
  if (w < 1100 && touch) return "tablet";
  return "laptop";
}

export function deviceCameraProfile(kind?: DeviceKind): DeviceCameraProfile {
  const k = kind ?? detectDeviceKind();
  switch (k) {
    case "phone":
      return {
        kind: "phone",
        label: "Смартфон",
        shoulderMin: 0.1,
        shoulderMax: 0.3,
        bodyHeightMin: 0.45,
        bodyHeightMax: 0.88,
        distanceHint: "Телефон на уровне груди, 1.5–2.5 м. Для бокса ступни не обязательны",
      };
    case "tablet":
      return {
        kind: "tablet",
        label: "Планшет",
        shoulderMin: 0.1,
        shoulderMax: 0.32,
        bodyHeightMin: 0.48,
        bodyHeightMax: 0.9,
        distanceHint: "Планшет на подставке, 1.5–2 м от вас",
      };
    default:
      return {
        kind: "laptop",
        label: "Ноутбук",
        shoulderMin: 0.12,
        shoulderMax: 0.38,
        bodyHeightMin: 0.42,
        bodyHeightMax: 0.92,
        distanceHint: "MateBook 14: 55–80 см от экрана, крышка 110°, свет в лицо",
      };
  }
}

export async function canSwitchCameraFacing(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return false;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    if (cams.length >= 2) return true;
    const touch = isTouchDevice();
    const narrow = typeof window !== "undefined" && window.innerWidth < 1100;
    return touch && narrow;
  } catch {
    return false;
  }
}
