import { useNavigate, useLocation } from 'react-router-dom';
import { usePipelineStore, PipelineStep } from '../store/useStepStore';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '../hooks/useReducedMotion';

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

const stepOrder: PipelineStep[] = ['upload', 'eda', 'clean', 'transform', 'train', 'results', 'export'];

export default function PipelineSpine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { steps, setCurrentStep, canNavigateToStep, currentStep } = usePipelineStore();
  const prefersReducedMotion = useReducedMotion();
  
  // Refs for animations and scrolling
  const checkmarkRefs = useRef<Record<string, SVGPathElement | null>>({});
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stepButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const stepContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousStepsRef = useRef<Record<PipelineStep, { status: string }>>({} as any);
  const previousCurrentStepRef = useRef<PipelineStep | null>(null);
  const desktopScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to current step
  useEffect(() => {
    const currentStepElement = stepContainerRefs.current[currentStep];
    if (!currentStepElement) return;

    const scrollContainer = desktopScrollContainerRef.current || mobileScrollContainerRef.current;
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = currentStepElement.getBoundingClientRect();
    
    // Check if element is visible in container
    const isVertical = scrollContainer === desktopScrollContainerRef.current;
    
    if (isVertical) {
      const elementTop = elementRect.top - containerRect.top;
      const elementBottom = elementRect.bottom - containerRect.bottom;
      
      if (elementTop < 0 || elementBottom > 0) {
        currentStepElement.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    } else {
      const elementLeft = elementRect.left - containerRect.left;
      const elementRight = elementRect.right - containerRect.right;
      
      if (elementLeft < 0 || elementRight > 0) {
        currentStepElement.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentStep, prefersReducedMotion]);

  // Enhanced animations for step state changes
  useEffect(() => {
    if (prefersReducedMotion) return;

    Object.keys(steps).forEach((stepKey) => {
      const step = stepKey as PipelineStep;
      const currentStatus = steps[step].status;
      const previousStatus = previousStepsRef.current[step]?.status;
      const stepButton = stepButtonRefs.current[step];

      // Animate step unlock (locked -> available)
      if (currentStatus !== 'locked' && previousStatus === 'locked') {
        if (stepButton) {
          gsap.fromTo(
            stepButton,
            {
              scale: 0.8,
              opacity: 0.5,
              rotation: -180,
            },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.6,
              ease: 'back.out(1.7)',
            }
          );
        }
      }

      // Animate checkmark when step becomes completed
      if (currentStatus === 'completed' && previousStatus !== 'completed') {
        const checkmark = checkmarkRefs.current[step];
        if (checkmark) {
          gsap.fromTo(
            checkmark,
            { 
              strokeDasharray: 100,
              strokeDashoffset: 100,
              opacity: 0,
              scale: 0,
            },
            {
              strokeDashoffset: 0,
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: 'back.out(1.7)',
            }
          );
        }

        // Animate connecting line with glow effect
        const line = lineRefs.current[step];
        if (line) {
          gsap.fromTo(
            line,
            { 
              scaleY: 0, 
              transformOrigin: 'top',
              backgroundColor: 'var(--border-default)',
            },
            { 
              scaleY: 1, 
              duration: 0.5, 
              ease: 'power2.out', 
              delay: 0.3,
              backgroundColor: 'var(--accent-primary)',
            }
          );
        }

        // Pulse animation for completed step
        if (stepButton) {
          gsap.to(stepButton, {
            boxShadow: '0 0 20px var(--accent-primary-glow)',
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
          });
        }
      }

      // Animate current step highlight (when step becomes the current step)
      const isCurrent = step === currentStep;
      const wasCurrent = step === previousCurrentStepRef.current;
      if (isCurrent && !wasCurrent) {
        if (stepButton) {
          gsap.to(stepButton, {
            scale: 1.1,
            duration: 0.3,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
          });
        }
      }
    });

    // Update previous steps and current step
    previousStepsRef.current = { ...steps };
    previousCurrentStepRef.current = currentStep;
  }, [steps, currentStep, prefersReducedMotion]);

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
      <div 
        ref={desktopScrollContainerRef}
        className="hidden lg:block fixed left-0 top-20 bottom-0 w-24 bg-bg-elevated border-r border-border-default z-40 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent hover:scrollbar-thumb-accent-primary"
      >
        <div className="flex flex-col items-center py-8 gap-6">
          {(Object.keys(stepLabels) as PipelineStep[]).map((step, index) => {
            const stepState = steps[step];
            const isCurrent = isCurrentRoute(step);
            const isLocked = stepState.status === 'locked';
            const isCompleted = stepState.status === 'completed';
            const isError = stepState.status === 'error';
            
            // Check if previous step is completed to connect the line
            const prevStep = index > 0 ? stepOrder[index - 1] : null;
            const prevStepCompleted = prevStep ? steps[prevStep]?.status === 'completed' : false;
            const shouldConnectLine = isCompleted || prevStepCompleted;

            return (
              <div 
                key={step} 
                ref={(el) => { stepContainerRefs.current[step] = el; }}
                className="flex flex-col items-center gap-2"
              >
                {/* Step circle */}
                <motion.button
                  ref={(el) => { stepButtonRefs.current[step] = el; }}
                  onClick={() => handleStepClick(step)}
                  disabled={isLocked}
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-fast
                    ${isLocked ? 'bg-bg-interactive text-text-disabled cursor-not-allowed' : ''}
                    ${isCurrent ? 'bg-accent-primary text-text-primary glow-pulse' : ''}
                    ${isCompleted && !isCurrent ? 'bg-bg-surface border-2 border-accent-primary text-accent-primary glow-interactive' : ''}
                    ${isError ? 'bg-bg-surface border-2 border-error text-error' : ''}
                    ${!isLocked && !isCurrent && !isCompleted && !isError ? 'bg-bg-surface border-2 border-border-default text-text-secondary hover:border-accent-primary hover:glow-interactive' : ''}
                  `}
                  whileHover={!isLocked ? { scale: 1.1 } : {}}
                  whileTap={!isLocked ? { scale: 0.9 } : {}}
                  title={isLocked ? 'Complete previous steps first' : stepLabels[step]}
                >
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                      <path 
                        ref={(el) => { checkmarkRefs.current[step] = el; }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l3 3 7-7"
                      />
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
                  <div 
                    ref={(el) => { lineRefs.current[step] = el; }}
                    className={`
                      w-0.5 h-6 transition-colors duration-300
                      ${shouldConnectLine ? 'bg-accent-primary' : 'bg-border-default'}
                    `} 
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal bottom bar */}
      <div 
        ref={mobileScrollContainerRef}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-elevated border-t border-border-default z-40 overflow-x-auto scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent hover:scrollbar-thumb-accent-primary"
      >
        <div className="flex items-center justify-around py-3 px-2 min-w-max">
          {(Object.keys(stepLabels) as PipelineStep[]).map((step, index) => {
            const stepState = steps[step];
            const isCurrent = isCurrentRoute(step);
            const isLocked = stepState.status === 'locked';
            const isCompleted = stepState.status === 'completed';
            const isError = stepState.status === 'error';
            
            // Check if previous step is completed to connect the line
            const prevStep = index > 0 ? stepOrder[index - 1] : null;
            const prevStepCompleted = prevStep ? steps[prevStep]?.status === 'completed' : false;
            const shouldConnectLine = isCompleted || prevStepCompleted;

            return (
              <div 
                key={step} 
                ref={(el) => { stepContainerRefs.current[step] = el; }}
                className="flex items-center gap-2"
              >
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
                    w-6 h-0.5 transition-colors duration-300
                    ${shouldConnectLine ? 'bg-accent-primary' : 'bg-border-default'}
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
