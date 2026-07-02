"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { WorkoutPlan } from "@/lib/ai/workoutPlan";

export default function AiPlanCard({
  plan,
  onStart,
}: {
  plan: WorkoutPlan;
  onStart: () => void;
}) {
  return (
    <Card className="mb-4 border-sky-100 bg-gradient-to-br from-white to-sky-50">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        План на сегодня
      </p>
      <h3 className="mt-1 text-lg font-bold text-slate-900">{plan.title}</h3>
      <p className="mt-1 text-xs text-muted">~{plan.durationMin} мин</p>
      <ul className="mt-3 space-y-1.5">
        {plan.tips.map((tip) => (
          <li key={tip} className="flex gap-2 text-sm text-slate-600">
            <span className="text-emerald-500">✓</span>
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
