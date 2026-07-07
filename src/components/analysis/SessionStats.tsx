"use client";

import Card from "@/components/ui/Card";
import { formScoreLabel } from "@/lib/pose/formScore";
import { exerciseLabel } from "@/lib/pose/exercises";
import type { Sport, StrengthExercise } from "@/types";

interface StatItem {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  color: string;
}

interface SessionStatsProps {
  sport: Sport;
  exercise?: StrengthExercise | null;
  durationSec: number;
  avgVelocity: number;
  peakVelocity: number;
  formScore: number;
  fatigue: number;
  reps?: number;
  punches?: number;
  swings?: number;
}

export default function SessionStats({
  sport,
  exercise,
  durationSec,
  avgVelocity,
  peakVelocity,
  formScore,
  fatigue,
  reps,
  punches,
  swings,
}: SessionStatsProps) {
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;

  const items: StatItem[] = [
    {
      label: "Длительность",
      value: `${mins}:${secs.toString().padStart(2, "0")}`,
      color: "text-foreground",
    },
    {
      label: "Техника",
      value: `${formScore}`,
      unit: "%",
      sub: formScoreLabel(formScore),
      color:
        formScore >= 85
          ? "text-success"
          : formScore >= 70
            ? "text-primary"
            : "text-warning",
    },
    {
      label: "Ø Скорость",
      value: `${avgVelocity}`,
      unit: "м/с",
      color: "text-primary",
    },
    {
      label: "Пик VBT",
      value: `${peakVelocity}`,
      unit: "м/с",
      color: "text-accent",
    },
    {
      label: "Усталость",
      value: `${fatigue}`,
      unit: "%",
      color: "text-warning",
    },
  ];

  if (reps != null && reps > 0) {
    items.push({ label: "Повторы", value: `${reps}`, color: "text-success" });
  }
  if (punches != null && punches > 0) {
    items.push({ label: "Удары", value: `${punches}`, color: "text-readiness" });
  }
  if (swings != null && swings > 0) {
    items.push({ label: "Замахи", value: `${swings}`, color: "text-success" });
  }

  return (
    <Card className="mb-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        {exercise ? exerciseLabel(exercise) : sport} · Статистика
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-background-secondary px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p className={`text-lg font-bold tabular-nums ${item.color}`}>
              {item.value}
              {item.unit && (
                <span className="ml-0.5 text-[10px] font-normal text-muted">
                  {item.unit}
                </span>
              )}
            </p>
            {item.sub && (
              <p className="text-[10px] text-muted">{item.sub}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
