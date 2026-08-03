'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_OUT, DURATION } from '@/lib/motion';

interface MotionCtaProps {
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a CTA (a <Link>/<button>, passed as children so its own href/type/
 * onClick and visual classes are untouched) with a premium hover: a small
 * lift + soft shadow. Pairs with <ArrowGlyph>, which — sitting inside this
 * wrapper's `group` context — slides right on the same hover.
 */
export function MotionCta({ className = '', children }: MotionCtaProps) {
  return (
    <motion.div
      className={`group inline-block rounded-lg transition-shadow duration-300 hover:shadow-lg ${className}`}
      whileHover={{ y: -2 }}
      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** A trailing arrow glyph that slides right on hover — use inside a <MotionCta>. */
export function ArrowGlyph({ children = '→' }: { children?: ReactNode }) {
  return (
    <span aria-hidden className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
      {children}
    </span>
  );
}
