import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from './useReducedMotion';
import { DURATION, GSAP_EASING } from '../utils/motionConstants';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealOptions {
  /**
   * Animation type
   * @default 'fadeUp'
   */
  animation?: 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'fade' | 'scale';
  
  /**
   * Animation duration in seconds
   * @default DURATION.slow (0.8s)
   */
  duration?: number;
  
  /**
   * GSAP easing function
   * @default GSAP_EASING.easeOut
   */
  ease?: string;
  
  /**
   * Trigger point (0 = top of viewport, 1 = bottom)
   * @default 0.8
   */
  start?: string;
  
  /**
   * Whether to animate only once
   * @default true
   */
  once?: boolean;
  
  /**
   * Stagger delay for child elements (in seconds)
   * @default 0
   */
  stagger?: number;
  
  /**
   * Parallax effect (y-axis movement in pixels)
   * @default 0
   */
  parallax?: number;
}

/**
 * Hook to add scroll-driven reveal animations using GSAP ScrollTrigger
 * Automatically respects reduced motion preferences
 * 
 * @example
 * const ref = useScrollReveal({ animation: 'fadeUp', stagger: 0.1 });
 * return <div ref={ref}><div>Item 1</div><div>Item 2</div></div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const {
    animation = 'fadeUp',
    duration = DURATION.slow,
    ease = GSAP_EASING.easeOut,
    start = 'top 80%',
    once = true,
    stagger = 0,
    parallax = 0,
  } = options;

  const elementRef = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip animations if user prefers reduced motion
    if (prefersReducedMotion) {
      gsap.set(element, { opacity: 1, clearProps: 'all' });
      return;
    }

    // Get animation properties based on type
    const getAnimationProps = () => {
      switch (animation) {
        case 'fadeUp':
          return { y: 40, opacity: 0 };
        case 'fadeDown':
          return { y: -40, opacity: 0 };
        case 'fadeLeft':
          return { x: 40, opacity: 0 };
        case 'fadeRight':
          return { x: -40, opacity: 0 };
        case 'fade':
          return { opacity: 0 };
        case 'scale':
          return { scale: 0.9, opacity: 0 };
        default:
          return { y: 40, opacity: 0 };
      }
    };

    const fromProps = getAnimationProps();

    // Check if element has children for stagger animation
    const children = element.children;
    const hasChildren = children.length > 0 && stagger > 0;

    // Set initial state
    if (hasChildren) {
      gsap.set(children, fromProps);
    } else {
      gsap.set(element, fromProps);
    }

    // Create scroll trigger animation
    const scrollTrigger = ScrollTrigger.create({
      trigger: element,
      start: start,
      once: once,
      onEnter: () => {
        if (hasChildren) {
          gsap.to(children, {
            ...fromProps,
            y: 0,
            x: 0,
            scale: 1,
            opacity: 1,
            duration: duration,
            ease: ease,
            stagger: stagger,
            clearProps: 'all',
          });
        } else {
          gsap.to(element, {
            ...fromProps,
            y: 0,
            x: 0,
            scale: 1,
            opacity: 1,
            duration: duration,
            ease: ease,
            clearProps: 'all',
          });
        }
      },
    });

    // Add parallax effect if specified
    let parallaxTrigger: ScrollTrigger | undefined;
    if (parallax !== 0) {
      parallaxTrigger = ScrollTrigger.create({
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const yOffset = parallax * (progress - 0.5) * 2;
          gsap.set(element, { y: yOffset });
        },
      });
    }

    // Cleanup
    return () => {
      scrollTrigger.kill();
      if (parallaxTrigger) {
        parallaxTrigger.kill();
      }
    };
  }, [animation, duration, ease, start, once, stagger, parallax, prefersReducedMotion]);

  return elementRef;
}
