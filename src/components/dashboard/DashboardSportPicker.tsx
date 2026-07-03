"use client";

import { useCallback } from "react";
import SportPickerWidget from "@/components/dashboard/SportPickerWidget";
import { goToTraining } from "@/lib/navigation/goToTraining";
import type { Sport, StrengthExercise } from "@/types";

export default function DashboardSportPicker({
  highlight,
}: {
  highlight?: boolean;
}) {
  const onSelect = useCallback(
    (sport: Sport, exercise?: StrengthExercise) => {
      goToTraining(sport, exercise);
    },
    []
  );

  return <SportPickerWidget onSelect={onSelect} highlight={highlight} />;
}
