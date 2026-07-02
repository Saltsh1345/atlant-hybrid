import type { StrengthExercise } from "@/types";
import type { LiveKinematics } from "@/types";

export function exerciseLabel(ex: StrengthExercise): string {
  const map: Record<StrengthExercise, string> = {
    squat: "Присед",
    bench: "Жим",
    lunge: "Выпады",
  };
  return map[ex];
}

export function coachForExercise(
  ex: StrengthExercise,
  k: LiveKinematics,
  injuries = ""
): string | null {
  const inj = injuries.toLowerCase();
  if (inj.includes("колен") && k.kneeAngle < 100) {
    return "Осторожнее с глубиной — учитывайте колено.";
  }
  if (inj.includes("спин") && k.backAngle < 140) {
    return "Спина — держите корпус стабильнее.";
  }

  switch (ex) {
    case "squat":
      if (k.kneeAngle > 130) return "Ниже таз — глубже присед.";
      if (k.backAngle < 140) return "Держите спину ровно.";
      return null;
    case "bench":
      if (k.elbowAngle > 100 && k.elbowAngle < 140)
        return "Опускайте глубже — локти под 90°.";
      if (k.backAngle < 150) return "Лопатки сведены, грудь вверх.";
      return null;
    case "lunge":
      if (k.kneeAngle > 120) return "Ниже в выпад — колено ~90°.";
      if (k.backAngle < 145) return "Корпус вертикально.";
      return null;
  }
}

export function metricForExercise(
  ex: StrengthExercise,
  k: LiveKinematics
): { label: string; value: string; unit: string } {
  switch (ex) {
    case "bench":
      return { label: "Угол локтя", value: `${k.elbowAngle}`, unit: "°" };
    case "squat":
    case "lunge":
      return { label: "Угол колена", value: `${k.kneeAngle}`, unit: "°" };
  }
}

export function tensionForExercise(
  ex: StrengthExercise,
  k: LiveKinematics
): number {
  switch (ex) {
    case "bench":
      return Math.max(0, Math.min(1, (180 - k.elbowAngle) / 90));
    case "squat":
    case "lunge":
      return Math.max(0, Math.min(1, (180 - k.kneeAngle) / 90));
  }
}
