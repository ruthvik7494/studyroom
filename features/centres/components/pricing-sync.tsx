'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { availablePeriods, type Period } from '@/features/bookings/pricing';

const PricingSelectionContext = createContext<{ period: Period; setPeriod: (p: Period) => void } | null>(null);

/** Wraps the whole area containing both the Pricing tabs and the sidebar, so
 * selecting a period in one place updates the other without a full page
 * reload — a small, focused bit of client interactivity around otherwise
 * server-rendered content. */
export function PricingSyncProvider({ pricing, children }: { pricing: Record<string, number> | null; children: ReactNode }) {
  const periods = pricing ? availablePeriods(pricing) : [];
  const initial: Period = periods.includes('hour') ? 'hour' : (periods[0] ?? 'month');
  const [period, setPeriod] = useState<Period>(initial);
  return <PricingSelectionContext.Provider value={{ period, setPeriod }}>{children}</PricingSelectionContext.Provider>;
}

/** Falls back to local state if used outside a provider (shouldn't happen, but keeps this safe to reuse). */
export function usePricingSelection() {
  const ctx = useContext(PricingSelectionContext);
  const [localPeriod, setLocalPeriod] = useState<Period>('hour');
  if (ctx) return ctx;
  return { period: localPeriod, setPeriod: setLocalPeriod };
}
