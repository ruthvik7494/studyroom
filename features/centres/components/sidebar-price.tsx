'use client';
import { formatINR } from '@/lib/utils';
import { priceForPeriod, PERIOD_LABEL } from '@/features/bookings/pricing';
import { usePricingSelection } from './pricing-sync';

export function SidebarPrice({ pricing }: { pricing: Record<string, number> | null }) {
  const { period } = usePricingSelection();
  const price = pricing ? priceForPeriod(pricing, period) : null;

  if (price === null) {
    return <p className="text-sm text-muted-foreground">Pricing coming soon</p>;
  }
  return (
    <>
      <p className="text-xs text-muted-foreground">Starting From</p>
      <p className="font-display text-2xl font-bold text-primary">
        {formatINR(price)}<span className="text-sm font-medium text-muted-foreground">/{PERIOD_LABEL[period]}</span>
      </p>
    </>
  );
}
