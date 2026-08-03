'use client';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wraps the header's inner content row. Only the height is scroll-linked
 * (64px -> 56px over the first 80px of scroll) — everything else about the
 * header (background, blur, links) is untouched. useSpring smooths the raw
 * scroll-derived value so it never feels like it's snapping.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const { scrollY } = useScroll();
  const rawHeight = useTransform(scrollY, [0, 80], [64, 56]);
  const height = useSpring(rawHeight, { stiffness: 300, damping: 40, mass: 0.5 });

  return (
    <motion.div style={{ height }} className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6">
      {children}
    </motion.div>
  );
}
