'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { DURATION, EASE_OUT, fadeUpVariants, fadeInVariants } from '@/lib/motion';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView' | 'viewport'> {
  delay?: number;
  /** 'up' = fade + slide up (default). 'plain' = fade only, no movement. */
  variant?: 'up' | 'plain';
  /** How far before the element reaches the viewport edge to start the animation. */
  margin?: string;
}

/**
 * Fades (and optionally slides) content in once, the first time it enters
 * the viewport — used for section-level reveals throughout the site.
 * Animates only once (viewport once: true) so re-scrolling past a section
 * never replays it.
 */
export function Reveal({ delay = 0, variant = 'up', margin = '-80px', children, ...props }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={variant === 'up' ? fadeUpVariants : fadeInVariants}
      transition={{ duration: DURATION.slow, ease: EASE_OUT, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
