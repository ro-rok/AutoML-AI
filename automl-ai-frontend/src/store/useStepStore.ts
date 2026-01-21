import { create } from 'zustand';

export type StepStatus = 'locked' | 'ready' | 'in_progress' | 'completed' | 'error';

export type PipelineStep = 'upload' | 'eda' | 'clean' | 'transform' | 'train' | 'results' | 'export';

export type StepState = {
  status: StepStatus;
  completedAt?: Date;
  validationMessages: string[];
  aiSuggestions: string[];
  artifacts: string[];
};

interface PipelineState {
  // Current step
  currentStep: PipelineStep;
  setCurrentStep: (step: PipelineStep) => void;
  
  // Step states
  steps: Record<PipelineStep, StepState>;
  setStepStatus: (step: PipelineStep, status: StepStatus) => void;
  setStepValidations: (step: PipelineStep, messages: string[]) => void;
  setStepSuggestions: (step: PipelineStep, suggestions: string[]) => void;
  addStepArtifact: (step: PipelineStep, artifact: string) => void;
  completeStep: (step: PipelineStep) => void;
  
  // Navigation helpers
  canNavigateToStep: (step: PipelineStep) => boolean;
  getNextStep: () => PipelineStep | null;
  
  // Reset
  resetPipeline: () => void;
}

const stepOrder: PipelineStep[] = ['upload', 'eda', 'clean', 'transform', 'train', 'results', 'export'];

const initialStepState: StepState = {
  status: 'locked',
  validationMessages: [],
  aiSuggestions: [],
  artifacts: [],
};

const initialSteps: Record<PipelineStep, StepState> = {
  upload: { ...initialStepState, status: 'ready' }, // Upload is always ready
  eda: { ...initialStepState },
  clean: { ...initialStepState },
  transform: { ...initialStepState },
  train: { ...initialStepState },
  results: { ...initialStepState },
  export: { ...initialStepState },
};

export const usePipelineStore = create<PipelineState>((set, get) => ({
  currentStep: 'upload',
  steps: initialSteps,
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setStepStatus: (step, status) => set((state) => ({
    steps: {
      ...state.steps,
      [step]: {
        ...state.steps[step],
        status,
      },
    },
  })),
  
  setStepValidations: (step, messages) => set((state) => ({
    steps: {
      ...state.steps,
      [step]: {
        ...state.steps[step],
        validationMessages: messages,
      },
    },
  })),
  
  setStepSuggestions: (step, suggestions) => set((state) => ({
    steps: {
      ...state.steps,
      [step]: {
        ...state.steps[step],
        aiSuggestions: suggestions,
      },
    },
  })),
  
  addStepArtifact: (step, artifact) => set((state) => ({
    steps: {
      ...state.steps,
      [step]: {
        ...state.steps[step],
        artifacts: [...state.steps[step].artifacts, artifact],
      },
    },
  })),
  
  completeStep: (step) => {
    const stepIndex = stepOrder.indexOf(step);
    const nextStep = stepOrder[stepIndex + 1];
    
    set((state) => ({
      steps: {
        ...state.steps,
        [step]: {
          ...state.steps[step],
          status: 'completed',
          completedAt: new Date(),
        },
        // Unlock next step if it exists
        ...(nextStep ? {
          [nextStep]: {
            ...state.steps[nextStep],
            status: state.steps[nextStep].status === 'locked' ? 'ready' : state.steps[nextStep].status,
          },
        } : {}),
      },
    }));
  },
  
  canNavigateToStep: (step) => {
    const state = get();
    const stepState = state.steps[step];
    return stepState.status !== 'locked';
  },
  
  getNextStep: () => {
    const state = get();
    const currentIndex = stepOrder.indexOf(state.currentStep);
    const nextStep = stepOrder[currentIndex + 1];
    return nextStep || null;
  },
  
  resetPipeline: () => set({
    currentStep: 'upload',
    steps: initialSteps,
  }),
}));

// Legacy export for backward compatibility
export const useStepStore = usePipelineStore;

