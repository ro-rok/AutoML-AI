import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion, useGSAPCleanup } from '../hooks';
import { DURATION, GSAP_EASING, STAGGER } from '../utils/motionConstants';
import bg1Image from '../assets/AI-Robot.webp';
import OptimizedImage from './OptimizedImage';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface CinematicHeroProps {
  onStartPipeline: () => void;
  onLoadSample: () => void;
}

export default function CinematicHero({ onStartPipeline, onLoadSample }: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<HTMLDivElement>(null);
  const gradientOverlayRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { addTimeline } = useGSAPCleanup();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload background image for better performance
  useEffect(() => {
    const img = new Image();
    img.src = bg1Image;
    img.onload = () => setImageLoaded(true);
  }, []);

  // Enhanced parallax effect for background image with multi-speed layers and scroll-triggered animations
  useEffect(() => {
    if (!bgImageRef.current || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Background image parallax (slower movement for depth)
      gsap.to(bgImageRef.current, {
        yPercent: 30,
        scale: 1.1,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Scroll-based opacity fade for background image
      gsap.to(bgImageRef.current, {
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'center top',
          scrub: true,
        },
      });

      // Scroll-based blur effect for background
      gsap.to(bgImageRef.current, {
        filter: 'blur(4px)',
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Gradient overlay opacity change on scroll
      if (gradientOverlayRef.current) {
        gsap.to(gradientOverlayRef.current, {
          opacity: 0.8,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // Enhanced GSAP timeline with pipeline preview animation
  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: GSAP_EASING.easeOut } });

      // Background image fade in with scale (simplified for reduced motion)
      if (imageLoaded && bgImageRef.current) {
        tl.from(bgImageRef.current, {
          opacity: prefersReducedMotion ? 1 : 0,
          scale: prefersReducedMotion ? 1 : 1.15,
          duration: prefersReducedMotion ? 0 : DURATION.slow,
        }, 0);
      }

      // Headline word-by-word reveal
      tl.from('.hero-headline-word', {
        opacity: 0,
        y: 40,
        rotationX: -15,
        duration: DURATION.slow,
        stagger: STAGGER.medium,
      }, imageLoaded ? 0.2 : 0)
      .from('.hero-subheadline', {
        opacity: 0,
        y: 20,
        duration: DURATION.medium,
      }, '-=0.4')
      .from('.hero-cta', {
        opacity: 0,
        scale: 0.8,
        y: 20,
        duration: DURATION.medium,
        stagger: STAGGER.fast,
      }, '-=0.2')
      .from('.hero-trust', {
        opacity: 0,
        y: 10,
        duration: DURATION.fast,
        stagger: 0.1,
      }, '-=0.2')
      .from('.hero-preview', {
        opacity: 0,
        scale: 0.9,
        y: 30,
        duration: DURATION.slow,
      }, '-=0.3')
      // Pipeline preview step-by-step reveal
      .from('.pipeline-step', {
        opacity: 0,
        scale: 0.8,
        rotation: -10,
        duration: DURATION.medium,
        stagger: 0.15,
        ease: 'back.out(1.7)',
      }, '-=0.5')
      // Pipeline connecting lines animation
      .from('.pipeline-connector', {
        scaleX: 0,
        transformOrigin: 'left',
        duration: DURATION.fast,
        stagger: 0.1,
      }, '-=0.8');

      addTimeline(tl);
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion, addTimeline, imageLoaded]);

  return (
    <div ref={containerRef} className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      {/* Multi-layer background system */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base Image Layer with parallax */}
        <div 
          ref={bgImageRef}
          className="absolute inset-0 w-full h-full will-change-transform"
          style={{ 
            transform: prefersReducedMotion ? 'none' : undefined,
            willChange: prefersReducedMotion ? 'auto' : 'transform, opacity, filter',
          }}
        >
          <OptimizedImage
            src={bg1Image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            width={1920}
            height={1080}
          />
        </div>

        {/* Gradient Overlay Layer */}
        <div 
          ref={gradientOverlayRef}
          className="absolute inset-0 bg-gradient-to-b from-bg-base/80 via-bg-elevated/60 to-bg-base/90"
        />

        {/* Vignette Effect */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
          }}
        />

        {/* Color Grading Overlay (red accent) */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 50%, rgba(239, 68, 68, 0.05) 100%)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Dynamic lighting effects */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
          }}
        />

        {/* Subtle grain texture for depth */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>
      
      {/* Content with enhanced contrast for readability */}
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Text shadow overlay for better readability */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.2) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* Animated Headline with enhanced contrast */}
        <h1 className="text-hero mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span className="hero-headline-word inline-block">Build</span>{' '}
          <span className="hero-headline-word inline-block">ML</span>{' '}
          <span className="hero-headline-word inline-block">Pipelines.</span>
          <br />
          <span className="hero-headline-word inline-block">Visually.</span>{' '}
          <span className="hero-headline-word inline-block">Confidently.</span>
        </h1>

        {/* Subheadline with enhanced contrast */}
        <p className="hero-subheadline text-heading text-text-secondary mb-12 max-w-3xl mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          From raw data to production-ready models in minutes, guided by AI.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={onStartPipeline}
            className="hero-cta btn-primary text-lg px-8 py-4 glow-interactive"
          >
            Start Your Pipeline
          </button>
          <button
            onClick={onLoadSample}
            className="hero-cta btn-secondary text-lg px-8 py-4 glow-interactive"
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
        <div className="hero-preview relative max-w-5xl mx-auto">
          <div className="card p-6 sm:p-8 bg-bg-surface/90 backdrop-blur-sm border-border-strong">
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
              {['Upload', 'EDA', 'Clean', 'Transform', 'Train', 'Results', 'Export'].map((step, index) => (
                <div key={step} className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <div className="pipeline-step flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-bg-interactive border-2 border-border-default flex items-center justify-center text-text-secondary transition-all duration-300 hover:border-accent-primary hover:glow-interactive text-xs sm:text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="text-caption text-text-tertiary text-[10px] sm:text-xs whitespace-nowrap">{step}</span>
                  </div>
                  {index < 6 && (
                    <div className="pipeline-connector flex items-center gap-1 flex-shrink-0">
                      <div className="w-4 sm:w-6 md:w-8 h-0.5 bg-border-default" />
                      <svg 
                        className="w-3 h-3 sm:w-4 sm:h-4 text-border-default flex-shrink-0" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
