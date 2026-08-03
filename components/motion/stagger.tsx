'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { DURATION, EASE_OUT, fadeUpVariants, staggerContainer } from '@/lib/motion';

interface StaggerGroupProps extends Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'whileInView' | 'viewport'> {
  stagger?: number;
  delay?: number;
  margin?: string;
}

/** Wraps a set of <StaggerItem> children — reveals them in sequence, once, on scroll into view. */
export function StaggerGroup({ stagger = 0.08, delay = 0, margin = '-60px', children, ...props }: StaggerGroupProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={staggerContainer(stagger, delay)}
      {...props}
    >
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
