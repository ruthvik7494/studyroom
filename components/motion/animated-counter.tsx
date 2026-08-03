'use client';
import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface AnimatedCounterProps {
  /** e.g. "120+", "4.5/5", "500+", "—" — a non-numeric or missing value renders as static (empty) text. */
  value: string | undefined;
  className?: string;
}

/** Counts up to the numeric part of `value` once, the first time it scrolls into view. No bounce (bounce: 0) — a smooth settle, not a spring wobble. */
export function AnimatedCounter({ value = '', className }: AnimatedCounterProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const digitsRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-40px' });

  const match = value.match(/^(\d+(\.\d+)?)/);
  const numeric = match ? parseFloat(match[1]) : null;
  const decimals = match?.[2] ? match[2].length - 1 : 0;
  const suffix = match ? value.slice(match[1].length) : '';

  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 1200, bounce: 0 });

  useEffect(() => {
    if (inView && numeric !== null) motionVal.set(numeric);
  }, [inView, numeric, motionVal]);

  useEffect(() => {
    if (numeric === null) return;
    const unsubscribe = spring.on('change', (v) => {
      if (digitsRef.current) digitsRef.current.textContent = v.toFixed(decimals);
    });
    return unsubscribe;
  }, [spring, numeric, decimals]);

  if (numeric === null) {
    return <p ref={containerRef} className={className}>{value}</p>;
  }

  return (
    <p ref={containerRef} className={className}>
      <span ref={digitsRef}>0</span>{suffix}
    </p>
  );
}
