import type { SessionSummary, Sport, StrengthExercise } from "@/types";

const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const SPORT_TITLE: Record<Sport, string> = {
  strength: "Силовые",
  boxing: "Бокс",
  tennis: "Теннис",
};

const EXERCISE_TITLE: Record<StrengthExercise, string> = {
  squat: "Присед",
  bench: "Жим",
  lunge: "Выпады",
};

export function formatKg(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} кг`;
}

export function sessionTitle(s: SessionSummary): string {
  if (s.sport === "strength" && s.exercise) {
    return EXERCISE_TITLE[s.exercise] ?? "Силовые";
  }
  return SPORT_TITLE[s.sport];
}

export function estimateSessionVolume(s: SessionSummary, weightKg = 75): number {
  if (s.sport === "strength") {
    const reps = s.reps ?? Math.round(s.durationSec / 8);
    const load =
      s.exercise === "squat"
        ? weightKg * 0.9
        : s.exercise === "bench"
          ? weightKg * 0.65
          : weightKg * 0.5;
    return Math.round(reps * load);
  }
  // proxy volume for skill sports: speed · duration
  return Math.round((s.avgVelocity || 1) * (s.durationSec / 6) * weightKg * 0.15);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sessionsInRange(history: SessionSummary[], from: number, to: number) {
  return history.filter((s) => {
    const t = new Date(s.completedAt).getTime();
    return t >= from && t < to;
  });
}

export function relativeSessionDay(iso: string): string {
  const day = startOfDay(new Date(iso)).getTime();
  const today = startOfDay(new Date()).getTime();
  const diff = Math.round((today - day) / 86_400_000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Вчера";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export interface OverviewKpis {
  weeklyVolume: number;
  weeklyVolumeDeltaPct: number;
  workoutsDone: number;
  workoutsGoal: number;
  workoutsDeltaPct: number;
  avgSessionMin: number;
  avgSessionDeltaMin: number;
  recoveryScore: number;
  recoveryDelta: number;
}

export interface DayVolumePoint {
  label: string;
  volume: number;
}

export interface WeekLoadPoint {
  label: string;
  load: number;
}

export interface MuscleGroupRing {
  id: string;
  label: string;
  pct: number;
  color: string;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  when: string;
  volumeLabel: string;
}

export interface OverviewData {
  kpis: OverviewKpis;
  dailyVolume: DayVolumePoint[];
  weekLoads: WeekLoadPoint[];
  muscleGroups: MuscleGroupRing[];
  recent: RecentActivityItem[];
  programPct: number;
  programWeek: number;
  programWeeks: number;
  volumeDeltaPct: number;
}

export function computeOverviewData(
  history: SessionSummary[],
  recoveryScore: number,
  weightKg = 75
): OverviewData {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = todayStart - 6 * 86_400_000;
  const prevWeekStart = weekStart - 7 * 86_400_000;

  const thisWeek = sessionsInRange(history, weekStart, todayStart + 86_400_000);
  const prevWeek = sessionsInRange(history, prevWeekStart, weekStart);

  const vol = (list: SessionSummary[]) =>
    list.reduce((a, s) => a + estimateSessionVolume(s, weightKg), 0);

  const weeklyVolume = vol(thisWeek);
  const prevVolume = vol(prevWeek);
  const weeklyVolumeDeltaPct =
    prevVolume > 0
      ? Math.round(((weeklyVolume - prevVolume) / prevVolume) * 100)
      : weeklyVolume > 0
        ? 100
        : 0;

  const workoutsGoal = 5;
  const workoutsDone = thisWeek.length;
  const prevWorkouts = prevWeek.length;
  const workoutsDeltaPct =
    prevWorkouts > 0
      ? Math.round(((workoutsDone - prevWorkouts) / prevWorkouts) * 100)
      : workoutsDone > 0
        ? 100
        : 0;

  const avg = (list: SessionSummary[]) =>
    list.length
      ? Math.round(
          list.reduce((a, s) => a + s.durationSec, 0) / list.length / 60
        )
      : 0;
  const avgSessionMin = avg(thisWeek);
  const avgSessionDeltaMin = avgSessionMin - avg(prevWeek);

  const dailyVolume: DayVolumePoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart + i * 86_400_000);
    const from = day.getTime();
    const to = from + 86_400_000;
    const daySessions = sessionsInRange(history, from, to);
    return {
      label: WEEKDAY_SHORT[day.getDay() === 0 ? 6 : day.getDay() - 1],
      volume: vol(daySessions),
    };
  });

  // Fix weekday labels using actual dates
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart + i * 86_400_000);
    const wd = day.getDay();
    dailyVolume[i].label = WEEKDAY_SHORT[wd === 0 ? 6 : wd - 1];
  }

  const weekLoads: WeekLoadPoint[] = Array.from({ length: 8 }, (_, i) => {
    const end = todayStart + 86_400_000 - (7 - i) * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    return {
      label: `Н${i + 1}`,
      load: vol(sessionsInRange(history, start, end)),
    };
  });

  const strength = thisWeek.filter((s) => s.sport === "strength");
  const legs = strength.filter((s) => s.exercise === "squat" || s.exercise === "lunge").length;
  const push = strength.filter((s) => s.exercise === "bench").length;
  const pull = thisWeek.filter((s) => s.sport === "boxing").length + Math.max(0, strength.length - legs - push);
  const core = thisWeek.filter((s) => s.sport === "tennis").length;
  const denom = Math.max(1, thisWeek.length);
  const muscleGroups: MuscleGroupRing[] = [
    { id: "legs", label: "Ноги", pct: Math.min(100, Math.round((legs / denom) * 100) || (thisWeek.length ? 45 : 0)), color: "var(--neon-lime, #ccff00)" },
    { id: "push", label: "Жим", pct: Math.min(100, Math.round((push / denom) * 100) || (thisWeek.length ? 36 : 0)), color: "var(--muscle-push, #a78bfa)" },
    { id: "pull", label: "Тяга", pct: Math.min(100, Math.round((pull / denom) * 100) || (thisWeek.length ? 32 : 0)), color: "var(--muscle-pull, #f472b6)" },
    { id: "core", label: "Корпус", pct: Math.min(100, Math.round((core / denom) * 100) || (thisWeek.length ? 22 : 0)), color: "var(--muscle-core, #2dd4bf)" },
  ];

  // When no sessions, show empty rings (0) not fake demo %
  if (thisWeek.length === 0) {
    for (const g of muscleGroups) g.pct = 0;
  }

  const recent = [...history]
    .sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt))
    .slice(0, 3)
    .map((s, i) => ({
      id: `${s.completedAt}-${i}`,
      title: sessionTitle(s),
      when: relativeSessionDay(s.completedAt),
      volumeLabel: formatKg(estimateSessionVolume(s, weightKg)),
    }));

  const programWeeks = 12;
  const programWeek = Math.min(programWeeks, Math.max(1, Math.ceil(history.length / 2) || 1));
  const programPct = Math.round((programWeek / programWeeks) * 100);

  return {
    kpis: {
      weeklyVolume,
      weeklyVolumeDeltaPct,
      workoutsDone,
      workoutsGoal,
      workoutsDeltaPct,
      avgSessionMin,
      avgSessionDeltaMin,
      recoveryScore: Math.round(recoveryScore),
      recoveryDelta: 0,
    },
    dailyVolume,
    weekLoads,
    muscleGroups,
    recent,
    programPct,
    programWeek,
    programWeeks,
    volumeDeltaPct: weeklyVolumeDeltaPct,
  };
}
