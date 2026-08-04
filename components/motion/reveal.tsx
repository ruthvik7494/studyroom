'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { DURATION, EASE_OUT, fadeUpVariants, fadeInVariants } from '@/lib/motion';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView' | 'viewport' | 'animate'> {
  delay?: number;
  /** 'up' = fade + slide up (default). 'plain' = fade only, no movement. */
  variant?: 'up' | 'plain';
  /** How far before the element reaches the viewport edge to start the animation. Ignored when trigger="load". */
  margin?: string;
  /**
   * 'view' (default) = animate the first time this scrolls into view — for
   * content below the fold. 'load' = animate once on mount instead — use
   * this for anything above the fold (already visible at page load), where
   * viewport-detection timing can fight with a parent's own load animation
   * and cause a visible snap instead of one smooth motion.
   */
  trigger?: 'view' | 'load';
}

/**
 * Fades (and optionally slides) content in once — either the first time it
 * enters the viewport, or on mount (see `trigger`). Used for section-level
 * reveals throughout the site.
 */
export function Reveal({ delay = 0, variant = 'up', margin = '-80px', trigger = 'view', children, ...props }: RevealProps) {
  const variants = variant === 'up' ? fadeUpVariants : fadeInVariants;
  const transition = { duration: DURATION.slow, ease: EASE_OUT, delay };

  if (trigger === 'load') {
    return (
      <motion.div initial="hidden" animate="visible" variants={variants} transition={transition} {...props}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={variants}
      transition={transition}
      {...props}
    >
      {children}
    </motion.div>
  );
}
