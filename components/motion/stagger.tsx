'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { DURATION, EASE_OUT, fadeUpVariants, staggerContainer } from '@/lib/motion';

interface StaggerGroupProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView' | 'viewport' | 'animate'> {
  stagger?: number;
  delay?: number;
  margin?: string;
  /** 'view' (default) = reveal on scroll-into-view. 'load' = reveal on mount — use for above-the-fold content (see <Reveal>'s trigger prop for why). */
  trigger?: 'view' | 'load';
}

/** Wraps a set of <StaggerItem> children — reveals them in sequence, either on scroll into view or on mount. */
export function StaggerGroup({ stagger = 0.08, delay = 0, margin = '-60px', trigger = 'view', children, ...props }: StaggerGroupProps) {
  const variants = staggerContainer(stagger, delay);

  if (trigger === 'load') {
    return (
      <motion.div initial="hidden" animate="visible" variants={variants} {...props}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin }} variants={variants} {...props}>
      {children}
    </motion.div>
  );
}

/** One item inside a <StaggerGroup> — must be a direct or indirect descendant so it inherits the "visible" trigger. */
export function StaggerItem({ children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={fadeUpVariants} transition={{ duration: DURATION.base, ease: EASE_OUT }} {...props}>
      {children}
    </motion.div>
  );
}
