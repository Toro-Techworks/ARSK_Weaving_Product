import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReducedMotionConfig,
  defaultTransition,
  modalOverlayVariants,
  modalContentVariants,
  reducedMotionModalContentVariants,
} from '../utils/motion';

export function AnimatedModal({ open, onClose, children, className = '', maxWidth = 'max-w-lg' }) {
  const reduceMotion = useReducedMotionConfig();
  const contentVariants = reduceMotion ? reducedMotionModalContentVariants : modalContentVariants;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={modalOverlayVariants}
          transition={defaultTransition}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={contentVariants}
            transition={defaultTransition}
            className={`bg-white rounded-xl shadow-lg w-full ${maxWidth} max-h-[90vh] overflow-y-auto ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimatedModal;
