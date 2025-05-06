// src/components/PipelineNavigator.tsx
import React, { useRef, useLayoutEffect } from 'react'
import { useWindowSize } from 'react-use'
import { useSwipeable } from 'react-swipeable'
import { useStepStore } from '../store/useStepStore'
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
  const current = useStepStore((state) => state.currentStep)
  const setStep = useStepStore((state) => state.setStep)

  // DESKTOP: apply pipeline-bg here
  if (!isMobile) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto pipeline-bg">
        <div className="absolute inset-0 flex flex-row items-center">
          {STEPS.map((step, i) => {
            const dist = Math.abs(i - current)
            const ratio = dist === 0 ? 0.8 : dist === 1 ? 0.4 : 0.2

            return (
              <React.Fragment key={step.key}>
                <div
                  onClick={() => setStep(i)}
                  className={`
                    flex flex-col bg-black/50 border rounded-lg shadow-lg
                    transition-all duration-500 ease-out cursor-pointer
                    ${i === current ? 'border-red-500' : 'border-gray-700'}
                  `}
                  style={{
                    flexGrow: i === current ? 4 : (Math.abs(i - current) === 1 ? 2 : 1),
                    flexBasis: 0,
                    flexShrink: 1,
                    height: height * ratio,
                    margin: '0 8px',
                    overflow: i === current ? 'auto' : 'hidden',
                  }}
                >
                  {i === current
                    ? <div className="p-4 flex-1"><step.Component /></div>
                    : <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <step.Icon className="w-8 h-8 text-red-500 mb-2" />
                        <span className="text-sm">{step.label}</span>
                      </div>
                  }
                </div>
                {i < STEPS.length - 1 && <div className="flex items-center"><WavyArrow/></div>}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  // MOBILE: unchanged
  const StepComponent = STEPS[current].Component
  const swipeHandlers = useSwipeable({
    onSwipedLeft:  () => current < STEPS.length - 1 && setStep(current + 1),
    onSwipedRight: () => current > 0               && setStep(current - 1),
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
        <button onClick={() => current > 0 && setStep(current - 1)} className="text-red-500">
          <FiChevronLeft size={24} />
        </button>
        <span className="text-red-500 font-semibold">
          {STEPS[current].label} ({current + 1}/{STEPS.length})
        </span>
        <button onClick={() => current < STEPS.length - 1 && setStep(current + 1)} className="text-red-500">
          <FiChevronRight size={24} />
        </button>
      </div>
    </div>
  )
}
