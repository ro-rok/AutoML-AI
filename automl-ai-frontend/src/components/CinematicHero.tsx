import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion, useGSAPCleanup } from '../hooks';
import { DURATION, GSAP_EASING, STAGGER } from '../utils/motionConstants';

interface CinematicHeroProps {
  onStartPipeline: () => void;
  onLoadSample: () => void;
}

export default function CinematicHero({ onStartPipeline, onLoadSample }: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { addTimeline } = useGSAPCleanup();

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: GSAP_EASING.easeOut } });

      // Animation sequence
      tl.from('.hero-headline-word', {
        opacity: 0,
        y: 30,
        duration: DURATION.slow,
        stagger: STAGGER.medium,
      })
      .from('.hero-subheadline', {
        opacity: 0,
        y: 20,
        duration: DURATION.medium,
      }, '-=0.4')
      .from('.hero-cta', {
        opacity: 0,
        scale: 0.9,
        duration: DURATION.medium,
        stagger: STAGGER.fast,
      }, '-=0.2')
      .from('.hero-trust', {
        opacity: 0,
        y: 10,
        duration: DURATION.fast,
      }, '-=0.2')
      .from('.hero-preview', {
        opacity: 0,
        scale: 0.95,
        duration: DURATION.slow,
      }, '-=0.3');

      addTimeline(tl);
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion, addTimeline]);

  return (
    <div ref={containerRef} className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-base via-bg-elevated to-bg-base opacity-50" />
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Animated Headline */}
        <h1 className="text-hero mb-6">
          <span className="hero-headline-word inline-block">Build</span>{' '}
          <span className="hero-headline-word inline-block">ML</span>{' '}
          <span className="hero-headline-word inline-block">Pipelines.</span>
          <br />
          <span className="hero-headline-word inline-block">Visually.</span>{' '}
          <span className="hero-headline-word inline-block">Confidently.</span>
        </h1>

        {/* Subheadline */}
        <p className="hero-subheadline text-heading text-text-secondary mb-12 max-w-3xl mx-auto">
          From raw data to production-ready models in minutes, guided by AI.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={onStartPipeline}
            className="hero-cta btn-primary text-lg px-8 py-4"
          >
            Start Your Pipeline
          </button>
          <button
            onClick={onLoadSample}
            className="hero-cta btn-secondary text-lg px-8 py-4"
          >
            Load Sample Dataset
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="hero-trust flex flex-wrap justify-center gap-8 text-text-tertiary text-body mb-16">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No login required</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>7-day session persistence</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Export to PDF & Notebook</span>
          </div>
        </div>

        {/* Pipeline Preview Animation */}
        <div className="hero-preview relative max-w-4xl mx-auto">
          <div className="card p-8">
            <div className="flex items-center justify-between gap-4 overflow-x-auto">
              {['Upload', 'EDA', 'Clean', 'Transform', 'Train', 'Results', 'Export'].map((step, index) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2 min-w-[80px]">
                    <div className="w-12 h-12 rounded-full bg-bg-interactive border-2 border-border-default flex items-center justify-center text-text-secondary">
                      {index + 1}
                    </div>
                    <span className="text-caption text-text-tertiary">{step}</span>
                  </div>
                  {index < 6 && (
                    <div className="w-8 h-0.5 bg-border-default" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle background particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-primary opacity-5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary opacity-5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
