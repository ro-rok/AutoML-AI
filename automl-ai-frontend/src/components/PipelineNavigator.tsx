// src/components/PipelineNavigator.tsx
import React, { useRef, useLayoutEffect, useEffect } from 'react'
import { useWindowSize } from 'react-use'
import { useSwipeable } from 'react-swipeable'
import { useStepStore, PipelineStep } from '../store/useStepStore'
import gsap from 'gsap'
import {
  FiUploadCloud,
  FiTrash2,
  FiBarChart2,
  FiRefreshCw,
  FiPlay,
  FiDownload,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi'

// pages...
import UploadPage    from '../pages/UploadPage'
import CleanPage     from '../pages/CleanPage'
import EDAPage       from '../pages/EDAPage'
import TransformPage from '../pages/TransformPage'
import TrainPage     from '../pages/TrainPage'
import ExportPage    from '../pages/ExportPage'

type Step = {
  key: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
  Component: React.FC
}

export const STEPS: Step[] = [
  { key: 'upload',    label: 'Upload',    Icon: FiUploadCloud, Component: UploadPage },
  { key: 'clean',     label: 'Clean',     Icon: FiTrash2,      Component: CleanPage },
  { key: 'eda',       label: 'EDA',       Icon: FiBarChart2,   Component: EDAPage },
  { key: 'transform', label: 'Transform', Icon: FiRefreshCw,   Component: TransformPage },
  { key: 'train',     label: 'Train',     Icon: FiPlay,        Component: TrainPage },
  { key: 'export',    label: 'Export',    Icon: FiDownload,    Component: ExportPage },
]

function WavyArrow() {
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    if (ref.current) {
      gsap.to(ref.current, {
        y: '+=6', repeat: -1, yoyo: true,
        ease: 'sine.inOut', duration: 1.2,
      })
    }
  }, [])
  return (
    <svg ref={ref} width="32" height="32" viewBox="0 0 40 40">
      <path d="M2,20 C10,10 30,30 38,20" fill="none" stroke="#ef4444" strokeWidth="3" />
      <polyline points="34,16 38,20 34,24" fill="none" stroke="#ef4444" strokeWidth="3" />
    </svg>
  )
}

export default function PipelineNavigator() {
  const { width, height } = useWindowSize()
  const isMobile = width < 768
  const currentStep = useStepStore((state: any) => state.currentStep)
  const setCurrentStep = useStepStore((state: any) => state.setCurrentStep)
  const steps = useStepStore((state: any) => state.steps)
  
  // Find current step index
  const current = STEPS.findIndex(s => s.key === currentStep)
  const currentIndex = current >= 0 ? current : 0
  
  // Refs for scrolling
  const desktopScrollContainerRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  
  // Auto-scroll to current step on desktop
  useEffect(() => {
    if (isMobile || !desktopScrollContainerRef.current) return
    
    const currentStepElement = stepRefs.current[currentIndex]
    if (!currentStepElement) return
    
    const container = desktopScrollContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const elementRect = currentStepElement.getBoundingClientRect()
    
    const elementLeft = elementRect.left - containerRect.left
    const elementRight = elementRect.right - containerRect.right
    
    if (elementLeft < 0 || elementRight > containerRect.width) {
      currentStepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [currentIndex, isMobile])
  
  const handleSetStep = (index: number) => {
    if (index >= 0 && index < STEPS.length) {
      setCurrentStep(STEPS[index].key as PipelineStep)
    }
  }

  // DESKTOP: apply pipeline-bg here
  if (!isMobile) {
    return (
      <div 
        ref={desktopScrollContainerRef}
        className="w-full h-full flex items-center justify-center overflow-x-auto overflow-y-hidden pipeline-bg scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-red-500"
      >
        <div className="flex flex-row items-center min-w-max px-4">
          {STEPS.map((step, i) => {
            const dist = Math.abs(i - currentIndex)
            const ratio = dist === 0 ? 0.8 : dist === 1 ? 0.4 : 0.2
            const stepStatus = steps[step.key as PipelineStep]?.status || 'locked'
            const isCompleted = stepStatus === 'completed'
            const prevStep = i > 0 ? STEPS[i - 1] : null
            const prevStepCompleted = prevStep ? (steps[prevStep.key as PipelineStep]?.status === 'completed') : false
            const shouldShowArrow = isCompleted || prevStepCompleted

            return (
              <React.Fragment key={step.key}>
                <div
                  ref={(el) => { stepRefs.current[i] = el }}
                  onClick={() => handleSetStep(i)}
                  className={`
                    flex flex-col bg-black/50 border rounded-lg shadow-lg
                    transition-all duration-500 ease-out cursor-pointer
                    ${i === currentIndex ? 'border-red-500' : 'border-gray-700'}
                  `}
                  style={{
                    flexGrow: i === currentIndex ? 4 : (Math.abs(i - currentIndex) === 1 ? 2 : 1),
                    flexBasis: 0,
                    flexShrink: 1,
                    height: height * ratio,
                    margin: '0 8px',
                    overflow: i === currentIndex ? 'auto' : 'hidden',
                  }}
                >
                  {i === currentIndex
                    ? <div className="p-4 flex-1"><step.Component /></div>
                    : <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <step.Icon className="w-8 h-8 text-red-500 mb-2" />
                        <span className="text-sm">{step.label}</span>
                      </div>
                  }
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex items-center">
                    {shouldShowArrow ? <WavyArrow/> : <div className="w-8 h-0.5 bg-gray-700" />}
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  // MOBILE: unchanged
  const StepComponent = STEPS[currentIndex]?.Component || STEPS[0].Component
  const swipeHandlers = useSwipeable({
    onSwipedLeft:  () => currentIndex < STEPS.length - 1 && handleSetStep(currentIndex + 1),
    onSwipedRight: () => currentIndex > 0               && handleSetStep(currentIndex - 1),
    trackTouch:   true,
    trackMouse:    false,
  })

  return (
    <div
      {...swipeHandlers}
      className="relative flex flex-col bg-black text-white w-full h-full"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="flex-1 overflow-auto">
        <StepComponent />
      </div>
      <div className="fixed bottom-10 left-0 w-full bg-gray-800 p-3 flex justify-between items-center">
        <button onClick={() => currentIndex > 0 && handleSetStep(currentIndex - 1)} className="text-red-500">
          <FiChevronLeft size={24} />
        </button>
        <span className="text-red-500 font-semibold">
          {STEPS[currentIndex]?.label || STEPS[0].label} ({currentIndex + 1}/{STEPS.length})
        </span>
        <button onClick={() => currentIndex < STEPS.length - 1 && handleSetStep(currentIndex + 1)} className="text-red-500">
          <FiChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}
