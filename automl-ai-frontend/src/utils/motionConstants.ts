/**
 * Motion System Constants
 * Centralized motion configuration for consistent animations
 */

// Duration Standards (in seconds)
export const DURATION = {
  fast: 0.2,      // 200ms - Micro-interactions, hover states, tooltips
  medium: 0.4,    // 400ms - Component transitions, modal open/close
  slow: 0.8,      // 800ms - Page transitions, complex sequences
} as const;

// Easing Standards
export const EASING = {
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',        // Entrances, reveals
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',    // Transitions, movements
  linear: 'linear',                              // Continuous animations
} as const;

// GSAP Easing (for GSAP animations)
export const GSAP_EASING = {
  easeOut: 'power2.out',
  easeInOut: 'power2.inOut',
  easeIn: 'power2.in',
  elastic: 'elastic.out(1, 0.5)',
  back: 'back.out(1.7)',
} as const;

// Framer Motion Spring Configs
export const SPRING = {
  default: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  gentle: {
    type: 'spring',
    stiffness: 100,
    damping: 20,
  },
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 10,
  },
} as const;

// Stagger Delays (in seconds)
export const STAGGER = {
  fast: 0.05,     // 50ms between items
  medium: 0.1,    // 100ms between items
  slow: 0.15,     // 150ms between items
} as const;

// Reduced Motion Overrides
export const REDUCED_MOTION = {
  duration: 0.05,  // 50ms - perceived as instant
  easing: 'linear',
} as const;

// Common Animation Variants for Framer Motion
export const VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
} as const;

// Page Transition Variants
export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: DURATION.medium,
      ease: EASING.easeOut,
    },
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
} as const;
