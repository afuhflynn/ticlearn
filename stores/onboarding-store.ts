import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Baseline {
  topicId: string;
  confidence: number;
}

interface OnboardingState {
  step: number;
  examLevelId: string | null;
  programIds: string[];
  examYear: number | null;
  examDate: string | null;
  baselines: Baseline[];
  isRetaking: boolean;
  studyHoursPerWeek: number | null;
}

interface OnboardingActions {
  setStep: (step: number) => void;
  setExamLevelId: (id: string) => void;
  setProgramIds: (ids: string[]) => void;
  setExamDate: (year: number | null, date: string | null) => void;
  setBaselines: (baselines: Baseline[]) => void;
  setStudyIntent: (isRetaking: boolean, studyHoursPerWeek: number | null) => void;
  reset: () => void;
}

type OnboardingStore = OnboardingState & OnboardingActions;

const initialState: OnboardingState = {
  step: 0,
  examLevelId: null,
  programIds: [],
  examYear: null,
  examDate: null,
  baselines: [],
  isRetaking: false,
  studyHoursPerWeek: null,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setExamLevelId: (id) =>
        set({ examLevelId: id, programIds: [], baselines: [] }),

      setProgramIds: (ids) => set({ programIds: ids }),

      setExamDate: (year, date) => set({ examYear: year, examDate: date }),

      setBaselines: (baselines) => set({ baselines }),

      setStudyIntent: (isRetaking, studyHoursPerWeek) =>
        set({ isRetaking, studyHoursPerWeek }),

      reset: () => set(initialState),
    }),
    {
      name: "ticlearn-onboarding",
    },
  ),
);
