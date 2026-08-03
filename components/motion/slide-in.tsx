'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { EASE_OUT, DURATION } from '@/lib/motion';

interface SlideInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport'> {
  direction?: 'left' | 'right';
  distance?: number;
  margin?: string;
}

/** Slides content in horizontally (opacity + x) once, the first time it enters the viewport. */
export function SlideIn({ direction = 'left', distance = 32, margin = '-80px', children, ...props }: SlideInProps) {
  const x = direction === 'left' ? -distance : distance;
  return (
    <motion.div
      initial={{ opacity: 0, x }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
