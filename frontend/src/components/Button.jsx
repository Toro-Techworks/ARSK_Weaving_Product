import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const transition = { duration: 0.2 };

export function Button({ children, variant = 'primary', type = 'button', disabled, className = '', ...props }) {
  const reduceMotion = useReducedMotion();
  const base = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark focus:ring-brand',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
  };
  return (
    <motion.button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      whileHover={reduceMotion || disabled ? undefined : { scale: 1.02 }}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.98 }}
      transition={transition}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default Button;
