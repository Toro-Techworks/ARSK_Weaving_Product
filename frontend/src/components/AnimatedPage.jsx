import React from 'react';
import { motion } from 'framer-motion';
import {
  useReducedMotionConfig,
  defaultTransition,
  pageVariants,
  reducedMotionPageVariants,
} from '../utils/motion';

/**
 * Wraps page content for route transitions. Use with AnimatePresence and key=location.pathname.
 */
export function AnimatedPage({ children, className = '' }) {
  const reduceMotion = useReducedMotionConfig();
  const variants = reduceMotion ? reducedMotionPageVariants : pageVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={defaultTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;
