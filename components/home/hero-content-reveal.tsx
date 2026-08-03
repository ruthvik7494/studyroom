'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_OUT, DURATION } from '@/lib/motion';

/** Fades the hero's text/search column up on page load. Uses `animate` (not `whileInView`) since the hero is already on screen at load. */
export function HeroContentReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
