'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { EASE_OUT, DURATION } from '@/lib/motion';

interface LoadRevealProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate'> {
  delay?: number;
  y?: number;
}

/**
 * Fades (and optionally slides up) content on mount — for above-the-fold
 * elements that are already on screen at load, where a viewport-triggered
 * <Reveal> would never fire since they never "enter" the viewport.
 */
export function LoadReveal({ delay = 0, y = 16, children, ...props }: LoadRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
