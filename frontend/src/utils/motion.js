import { useReducedMotion } from 'framer-motion';

/**
 * Use this to respect user's reduced-motion preference.
 * Returns true if animations should be reduced/disabled.
 */
export function useReducedMotionConfig() {
  return useReducedMotion();
}

/**
 * Default transition for most UI animations (short, snappy).
 */
export const defaultTransition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] };

/**
 * Page enter/exit variants for route transitions.
 */
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/**
 * Modal overlay + content variants.
 */
export const modalOverlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * Stagger container for list children.
 */
export const staggerContainerVariants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Reduced-motion overrides (no movement, instant or very short fade).
 */
export const reducedMotionPageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const reducedMotionModalContentVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
