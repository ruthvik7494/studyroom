'use client';
import { MotionConfig } from 'framer-motion';
import { DURATION, EASE_OUT } from '@/lib/motion';

/**
 * Wraps the whole app once. `reducedMotion="user"` makes every Framer
 * Motion animation site-wide automatically respect the OS-level
 * prefers-reduced-motion setting (Framer swaps transforms/opacity for
 * instant changes for those users) — no per-component checks needed.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE_OUT }}>
      {children}
    </MotionConfig>
  );
}
