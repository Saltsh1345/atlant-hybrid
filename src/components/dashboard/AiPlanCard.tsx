"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { WorkoutPlan } from "@/lib/ai/workoutPlan";

export default function AiPlanCard({
  plan,
  onStart,
  className = "",
}: {
  plan: WorkoutPlan;
  onStart: () => void;
  className?: string;
}) {
  return (
    <Card
      className={`border-[var(--primary)]/20 bg-gradient-to-br from-[var(--surface)] to-[var(--primary-muted)] md:p-5 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--primary)]">
        План на сегодня
      </p>
      <h3 className="mt-1 text-lg font-bold text-[var(--foreground)]">
        {plan.title}
      </h3>
      <p className="mt-1 text-xs text-[var(--muted)]">~{plan.durationMin} мин</p>
      <ul className="mt-3 space-y-1.5">
        {plan.tips.map((tip) => (
          <li
            key={tip}
            className="flex gap-2 text-sm text-[var(--foreground-secondary)]"
          >
            <span className="text-[var(--accent)]">✓</span>
            {tip}
          </li>
        ))}
      </ul>
      <Button size="md" className="mt-4 !w-auto" onClick={onStart}>
        Начать
      </Button>
    </Card>
  );
}
