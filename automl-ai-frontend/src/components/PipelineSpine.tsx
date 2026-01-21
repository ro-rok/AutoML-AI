import { useNavigate, useLocation } from 'react-router-dom';
import { usePipelineStore, PipelineStep } from '../store/useStepStore';
import { motion } from 'framer-motion';

// Step icons (using simple SVG icons)
const stepIcons: Record<PipelineStep, React.ReactElement> = {
  upload: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  eda: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  clean: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  transform: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  train: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  results: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  export: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const stepLabels: Record<PipelineStep, string> = {
  upload: 'Upload',
  eda: 'EDA',
  clean: 'Clean',
  transform: 'Transform',
  train: 'Train',
  results: 'Results',
  export: 'Export',
};

const stepRoutes: Record<PipelineStep, string> = {
  upload: '/upload',
  eda: '/eda',
  clean: '/clean',
  transform: '/transform',
  train: '/train',
  results: '/results',
  export: '/export',
};

export default function PipelineSpine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { steps, setCurrentStep, canNavigateToStep } = usePipelineStore();

  const handleStepClick = (step: PipelineStep) => {
    if (!canNavigateToStep(step)) {
      return;
    }
    setCurrentStep(step);
    navigate(stepRoutes[step]);
  };

  const isCurrentRoute = (step: PipelineStep) => {
    return location.pathname === stepRoutes[step];
  };

  return (
    <>
      {/* Desktop: Vertical sidebar */}
      <div className="hidden lg:block fixed left-0 top-20 bottom-0 w-24 bg-bg-elevated border-r border-border-default z-40">
        <div className="flex flex-col items-center py-8 gap-6">
          {(Object.keys(stepLabels) as PipelineStep[]).map((step, index) => {
            const stepState = steps[step];
            const isCurrent = isCurrentRoute(step);
            const isLocked = stepState.status === 'locked';
            const isCompleted = stepState.status === 'completed';
            const isError = stepState.status === 'error';

            return (
              <div key={step} className="flex flex-col items-center gap-2">
                {/* Step circle */}
                <motion.button
                  onClick={() => handleStepClick(step)}
                  disabled={isLocked}
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-fast
                    ${isLocked ? 'bg-bg-interactive text-text-disabled cursor-not-allowed' : ''}
                    ${isCurrent ? 'bg-accent-primary text-text-primary shadow-glow-primary' : ''}
                    ${isCompleted && !isCurrent ? 'bg-bg-surface border-2 border-accent-primary text-accent-primary' : ''}
                    ${isError ? 'bg-bg-surface border-2 border-error text-error' : ''}
                    ${!isLocked && !isCurrent && !isCompleted && !isError ? 'bg-bg-surface border-2 border-border-default text-text-secondary hover:border-accent-primary' : ''}
                  `}
                  whileHover={!isLocked ? { scale: 1.05 } : {}}
                  whileTap={!isLocked ? { scale: 0.95 } : {}}
                  title={isLocked ? 'Complete previous steps first' : stepLabels[step]}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepIcons[step]
                  )}
                  
                  {/* Pulsing animation for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-accent-primary opacity-30"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.button>

                {/* Step label */}
                <span className={`
                  text-caption text-center
                  ${isCurrent ? 'text-accent-primary font-medium' : ''}
                  ${isLocked ? 'text-text-disabled' : 'text-text-tertiary'}
                `}>
                  {stepLabels[step]}
                </span>

                {/* Validation messages */}
                {stepState.validationMessages.length > 0 && (
                  <div className="absolute left-full ml-2 w-48 bg-bg-surface border border-border-default rounded-md p-2 text-caption text-text-secondary">
                    {stepState.validationMessages[0]}
                  </div>
                )}

                {/* Connecting line */}
                {index < Object.keys(stepLabels).length - 1 && (
                  <div className={`
                    w-0.5 h-6
                    ${isCompleted ? 'bg-accent-primary' : 'bg-border-default'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-elevated border-t border-border-default z-40 overflow-x-auto">
        <div className="flex items-center justify-around py-3 px-2 min-w-max">
          {(Object.keys(stepLabels) as PipelineStep[]).map((step, index) => {
            const stepState = steps[step];
            const isCurrent = isCurrentRoute(step);
            const isLocked = stepState.status === 'locked';
            const isCompleted = stepState.status === 'completed';
            const isError = stepState.status === 'error';

            return (
              <div key={step} className="flex items-center gap-2">
                <motion.button
                  onClick={() => handleStepClick(step)}
                  disabled={isLocked}
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-fast
                    ${isLocked ? 'bg-bg-interactive text-text-disabled cursor-not-allowed' : ''}
                    ${isCurrent ? 'bg-accent-primary text-text-primary shadow-glow-primary' : ''}
                    ${isCompleted && !isCurrent ? 'bg-bg-surface border-2 border-accent-primary text-accent-primary' : ''}
                    ${isError ? 'bg-bg-surface border-2 border-error text-error' : ''}
                    ${!isLocked && !isCurrent && !isCompleted && !isError ? 'bg-bg-surface border-2 border-border-default text-text-secondary' : ''}
                  `}
                  whileTap={!isLocked ? { scale: 0.9 } : {}}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="scale-75">{stepIcons[step]}</div>
                  )}
                </motion.button>

                {/* Connecting line */}
                {index < Object.keys(stepLabels).length - 1 && (
                  <div className={`
                    w-6 h-0.5
                    ${isCompleted ? 'bg-accent-primary' : 'bg-border-default'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
