import { create } from "zustand";
import type {
  TrainingIntakeAnswers,
  TrainingIntakeRecord,
} from "@/lib/training/intake/types";

interface TrainingIntakeState {
  intake: TrainingIntakeRecord | null;
  draft: TrainingIntakeAnswers | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setIntake: (record: TrainingIntakeRecord | null) => void;
  setDraft: (draft: TrainingIntakeAnswers | null) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTrainingIntakeStore = create<TrainingIntakeState>((set) => ({
  intake: null,
  draft: null,
  loading: true,
  saving: false,
  error: null,
  setIntake: (intake) => set({ intake }),
  setDraft: (draft) => set({ draft }),
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  setError: (error) => set({ error }),
}));
