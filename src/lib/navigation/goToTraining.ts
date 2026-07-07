import { useAppStore } from "@/store/useAppStore";
import { trackingModeForPhase } from "@/lib/stateMachine";
import type { Sport, StrengthExercise } from "@/types";

/** Start training phase; bypasses state machine only if transition is blocked unexpectedly. */
export function goToTraining(
  sport: Sport,
  exercise?: StrengthExercise
): Promise<void> {
  const store = useAppStore.getState();
  store.ensureProfile();
  store.setSelectedSport(sport);
  if (exercise) store.setSelectedExercise(exercise);
  return store
    .refreshHealthReadiness()
    .catch(() => null)
    .then(() => {
      store.startSession();
      if (!store.setPhase("training")) {
        useAppStore.setState({
          phase: "training",
          trackingMode: trackingModeForPhase("training"),
        });
      }
    });
}
