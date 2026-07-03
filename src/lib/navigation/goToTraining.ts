import { useAppStore } from "@/store/useAppStore";
import { trackingModeForPhase } from "@/lib/stateMachine";
import type { Sport, StrengthExercise } from "@/types";

/** Start training phase; bypasses state machine only if transition is blocked unexpectedly. */
export function goToTraining(
  sport: Sport,
  exercise?: StrengthExercise
): void {
  const store = useAppStore.getState();
  store.ensureProfile();
  store.setSelectedSport(sport);
  if (exercise) store.setSelectedExercise(exercise);
  store.startSession();

  if (!store.setPhase("training")) {
    useAppStore.setState({
      phase: "training",
      trackingMode: trackingModeForPhase("training"),
    });
  }
}
