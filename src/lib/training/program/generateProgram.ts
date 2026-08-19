import type { DailyPlan } from "@/lib/plan/types";
import type { PlanGenerationContext } from "@/lib/plan/types";
import type { TrainingIntakeRecord } from "@/lib/training/intake/types";
import { GOAL_LABELS } from "@/lib/training/intake/types";
import { DELOAD_EVERY_WEEKS } from "@/lib/training/science/rules";
import { buildDayExercises } from "@/lib/training/program/exerciseGuards";
import {
  SPLIT_DAY_EXERCISES,
  SPLIT_DAY_LABELS,
  splitDaysForIntake,
  weekdaySlots,
} from "@/lib/training/program/splitTemplates";
import type {
  GeneratedProgram,
  ProgramDay,
  ProgramJson,
  ProgramWeek,
} from "@/lib/training/program/types";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Понедельник недели, содержащей startDate. */
function weekStartMonday(startDate: Date): Date {
  const d = new Date(startDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildProgramDay(
  dayIndex: number,
  splitKey: keyof typeof SPLIT_DAY_EXERCISES,
  context: PlanGenerationContext,
  intake: TrainingIntakeRecord,
  deload: boolean,
): ProgramDay {
  const exerciseIds = SPLIT_DAY_EXERCISES[splitKey] ?? SPLIT_DAY_EXERCISES.full_a;
  const exercises = buildDayExercises(exerciseIds, {
    location: intake.trainingLocation,
    deload,
    experienceLevel: intake.experienceLevel,
    context,
    intake,
  });

  const durationMin = exercises.reduce(
    (sum, ex) => sum + ex.sets * (ex.restSec / 60 + 0.5),
    0,
  );

  return {
    dayIndex,
    label: SPLIT_DAY_LABELS[splitKey] ?? splitKey,
    restDay: false,
    exercises,
    durationMin: Math.max(25, Math.round(durationMin)),
    focus: "strength",
  };
}

function dayToDailyPlan(day: ProgramDay, planDate: string): DailyPlan {
  return {
    planDate,
    title: day.label,
    focus: day.focus,
    durationMin: day.durationMin,
    source: "fallback" as DailyPlan["source"],
    exercises: day.exercises,
    tips: [],
    notRecoveredGroups: [],
    targetMeshes: Array.from(new Set(day.exercises.flatMap((e) => e.targetMuscles))),
    reason: "program_engine",
  };
}

/**
 * Генерирует полный мезоцикл 4–12 нед. и расписание дат.
 */
export function generateProgram(
  intake: TrainingIntakeRecord,
  context: PlanGenerationContext,
  startDate: string,
): GeneratedProgram {
  const weeksTotal = intake.programWeeksFinal;
  const splitKeys = splitDaysForIntake(intake.primaryGoal, intake.daysPerWeek);
  const slots = weekdaySlots(intake.daysPerWeek);
  const start = new Date(`${startDate}T12:00:00`);
  const monday = weekStartMonday(start);

  const weeks: ProgramWeek[] = [];
  const dailyPlans: GeneratedProgram["dailyPlans"] = [];

  for (let w = 1; w <= weeksTotal; w++) {
    const deload = w > 1 && w % DELOAD_EVERY_WEEKS === 0;
    const days: ProgramDay[] = [];
    let trainIdx = 0;

    for (let dow = 0; dow < 7; dow++) {
      const slotIndex = slots.indexOf(dow);
      if (slotIndex === -1) continue;

      const splitKey = splitKeys[slotIndex % splitKeys.length]!;
      const day = buildProgramDay(
        trainIdx,
        splitKey,
        context,
        intake,
        deload,
      );
      day.dayIndex = trainIdx;

      const planDate = toDateKey(
        addDays(monday, (w - 1) * 7 + dow),
      );
      day.planDate = planDate;

      days.push(day);
      dailyPlans.push({
        planDate,
        weekIndex: w,
        dayIndex: trainIdx,
        plan: dayToDailyPlan(day, planDate),
      });
      trainIdx++;
    }

    weeks.push({ weekIndex: w, deload, days });
  }

  const programJson: ProgramJson = { version: 1, weeks };
  const goalLabel = GOAL_LABELS[intake.primaryGoal];

  return {
    title: `${goalLabel} · ${weeksTotal} нед.`,
    programJson,
    source: "engine",
    intakeSnapshot: intake,
    scanSnapshot: context.bioScan
      ? {
          findings: context.bioScan.findings,
          hyperlordosisLikely: context.bioScan.hyperlordosisLikely,
          bodyFatPercent: context.bioScan.bodyFatPercent,
        }
      : null,
    dailyPlans,
  };
}
