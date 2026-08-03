/**
 * Shared motion primitives. Kept intentionally small and boring: one easing
 * curve, one duration range, no bounce — reused everywhere so every
 * animation in the app feels like it belongs to the same system.
 */

/** cubic-bezier(0.22,1,0.36,1) — smooth, no overshoot. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.2,
  base: 0.35,
  slow: 0.5,
} as const;

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

/** For a parent whose children use one of the variants above. */
export function staggerContainer(stagger = 0.08, delayChildren = 0) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Small per-index delay for lists rendered without a shared stagger parent (e.g. cards across a paginated grid). Capped so a long list doesn't keep animating for seconds. */
export function indexDelay(index: number, step = 0.06, cap = 6) {
  return Math.min(index, cap) * step;
}
