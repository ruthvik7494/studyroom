'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Very slow, subtle ambient zoom (1 → 1.03) on the hero background photo — a small "alive" touch that's easy to miss consciously but reads as premium. */
export function HeroBgZoom({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ scale: 1 }}
      animate={{ scale: 1.03 }}
      transition={{ duration: 22, ease: 'linear', repeat: Infinity, repeatType: 'mirror' }}
    >
      {children}
    </motion.div>
  );
}
