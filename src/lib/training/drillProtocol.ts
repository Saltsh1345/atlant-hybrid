import type { Sport } from "@/types";

export type DrillPhase =
  | "idle"
  | "instruction"
  | "countdown"
  | "active"
  | "fixation"
  | "rest"
  | "complete";

export interface DrillCommand {
  id: string;
  text: string;
  voice: string;
  activeSec: number;
  restSec: number;
  type: string;
}

export const BOXING_DRILL: DrillCommand[] = [
  {
    id: "b1",
    text: "Джеб левой",
    voice: "Джеб левой рукой. Готовьтесь.",
    activeSec: 6,
    restSec: 4,
    type: "jab",
  },
  {
    id: "b2",
    text: "Кросс правой",
    voice: "Кросс правой. Бейте вперёд.",
    activeSec: 6,
    restSec: 4,
    type: "cross",
  },
  {
    id: "b3",
    text: "Джеб + кросс",
    voice: "Два удара: джеб, затем кросс.",
    activeSec: 8,
    restSec: 5,
    type: "combo",
  },
  {
    id: "b4",
    text: "Хук левой",
    voice: "Левый хук. Разверните корпус.",
    activeSec: 6,
    restSec: 4,
    type: "hook",
  },
];

export const TENNIS_DRILL: DrillCommand[] = [
  {
    id: "t1",
    text: "Форхенд",
    voice: "Форхенд. Замах и удар.",
    activeSec: 7,
    restSec: 4,
    type: "forehand",
  },
  {
    id: "t2",
    text: "Бэкхенд",
    voice: "Бэкхенд. Поворот корпуса.",
    activeSec: 7,
    restSec: 4,
    type: "backhand",
  },
  {
    id: "t3",
    text: "Верхняя подача",
    voice: "Имитация подачи. Вверх и вперёд.",
    activeSec: 8,
    restSec: 5,
    type: "serve",
  },
];

export function drillForSport(sport: Sport): DrillCommand[] | null {
  if (sport === "boxing") return BOXING_DRILL;
  if (sport === "tennis") return TENNIS_DRILL;
  return null;
}
