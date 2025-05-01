import { create } from 'zustand';

interface StepState {
  currentStep: number;
  setStep: (index: number) => void;
}

export const useStepStore = create<StepState>((set) => ({
  currentStep: 0,
  setStep: (index) => set({ currentStep: index }),
}));
