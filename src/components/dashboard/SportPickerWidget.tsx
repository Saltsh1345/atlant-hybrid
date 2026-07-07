"use client";

import SportPicker from "@/components/training/SportPicker";
import type { Sport, StrengthExercise } from "@/types";

export default function SportPickerWidget({
  onSelect,
  highlight,
}: {
  onSelect: (sport: Sport, exercise?: StrengthExercise) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative z-10 h-full overflow-auto rounded-xl p-1 ${highlight ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      id="dashboard-sport-picker"
    >
      <p className="mb-2 text-xs font-semibold text-foreground-secondary">
        Выберите тренировку
      </p>
      <SportPicker compact onSelect={onSelect} />
    </div>
  );
}
