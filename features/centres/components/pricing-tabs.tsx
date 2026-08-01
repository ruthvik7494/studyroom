'use client';
import Link from 'next/link';
import { cn, formatINR } from '@/lib/utils';
import { PERIOD_LABEL, priceForPeriod, availablePeriods, type Period } from '@/features/bookings/pricing';
import { usePricingSelection } from './pricing-sync';

interface ResourceOpt { id: string; label: string; tier: string | null; pricing: Record<string, number> }

const PERIOD_META: Record<Period, { icon: string; blurb: string; bullets: [string, string]; ring: string; text: string; bg: string; button: string }> = {
  hour: { icon: '🕐', blurb: 'Perfect for short study sessions', bullets: ['Pay only for the time you use', 'Minimum booking 1 hour'], ring: 'border-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50', button: 'bg-emerald-600 hover:bg-emerald-700' },
  day: { icon: '📅', blurb: 'Great for focused study through the day', bullets: ['Unlimited access for the day', "Valid the centre's full open hours"], ring: 'border-sky-200', text: 'text-sky-700', bg: 'bg-sky-50', button: 'bg-sky-600 hover:bg-sky-700' },
  week: { icon: '📆', blurb: 'Ideal for a focused study week', bullets: ['Unlimited access for 7 days', 'Great for exam-prep sprints'], ring: 'border-teal-200', text: 'text-teal-700', bg: 'bg-teal-50', button: 'bg-teal-600 hover:bg-teal-700' },
  fortnight: { icon: '🗓', blurb: 'A solid two-week intensive stretch', bullets: ['Unlimited access for 14 days', 'Better value than two weekly plans'], ring: 'border-cyan-200', text: 'text-cyan-700', bg: 'bg-cyan-50', button: 'bg-cyan-600 hover:bg-cyan-700' },
  month: { icon: '📊', blurb: 'Ideal for regular learners and long-term plans', bullets: ['Unlimited access all month', 'Valid for 30 consecutive days'], ring: 'border-purple-200', text: 'text-purple-700', bg: 'bg-purple-50', button: 'bg-purple-600 hover:bg-purple-700' },
  quarter: { icon: '🎯', blurb: 'Best for committed, longer-term study plans', bullets: ['Unlimited access for 90 days', 'Better value than paying monthly'], ring: 'border-indigo-200', text: 'text-indigo-700', bg: 'bg-indigo-50', button: 'bg-indigo-600 hover:bg-indigo-700' },
  half_year: { icon: '🏆', blurb: 'For serious, sustained study habits', bullets: ['Unlimited access for 182 days', 'Strong savings across 6 months'], ring: 'border-rose-200', text: 'text-rose-700', bg: 'bg-rose-50', button: 'bg-rose-600 hover:bg-rose-700' },
  year: { icon: '⭐', blurb: 'Maximum savings for year-round learners', bullets: ['Unlimited access for 365 days', 'Our best overall value'], ring: 'border-amber-200', text: 'text-amber-700', bg: 'bg-amber-50', button: 'bg-amber-600 hover:bg-amber-700' },
};

const UNIT_LABEL: Record<Period, string> = {
  hour: '/hour', day: '/day', week: '/week', fortnight: '/2 weeks', month: '/month', quarter: '/quarter', half_year: '/6 months', year: '/year',
};

export function PricingTabs({ slug, resource }: { slug: string; resource: ResourceOpt }) {
  const periods = availablePeriods(resource.pricing);
  const { period: active, setPeriod: setActive } = usePricingSelection();

  if (periods.length === 0) return <p className="text-sm text-muted-foreground">Pricing details coming soon.</p>;

  const meta = PERIOD_META[active];
  const price = priceForPeriod(resource.pricing, active);

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">All prices include taxes</p>

      {/* Tabs */}
      <div className={cn('grid gap-1.5 grid-cols-2', periods.length >= 3 && 'sm:grid-cols-3', periods.length >= 4 && 'md:grid-cols-4')}>
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActive(p)}
            aria-pressed={active === p}
            className={cn(
              'rounded-lg border px-2 py-2 text-xs font-semibold sm:text-sm',
              active === p ? `${PERIOD_META[p].ring} ${PERIOD_META[p].bg} ${PERIOD_META[p].text}` : 'border-input text-muted-foreground hover:bg-secondary',
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {/* Active plan card */}
      <div className={cn('mt-4 rounded-xl border p-5', meta.ring, meta.bg)}>
        <div className="flex items-start gap-2">
          <span className="text-lg" aria-hidden>{meta.icon}</span>
          <div>
            <p className={cn('font-display font-bold', meta.text)}>{PERIOD_LABEL[active]}</p>
            <p className="text-xs text-muted-foreground">{meta.blurb}</p>
          </div>
        </div>

        <p className={cn('mt-4 font-display text-3xl font-bold', meta.text)}>
          {price !== null ? formatINR(price) : '—'}
          <span className="text-sm font-medium text-muted-foreground">{UNIT_LABEL[active]}</span>
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
          {meta.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className={meta.text} aria-hidden>✓</span>{b}
            </li>
          ))}
        </ul>

        <Link
          href={`/centres/${slug}/book?period=${active}&resource=${resource.id}`}
          className={cn('mt-4 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white', meta.button)}
        >
          Select Plan
        </Link>
        <Link href={`/centres/${slug}/book?period=${active}&resource=${resource.id}`} className={cn('mt-2 block text-center text-xs font-semibold', meta.text)}>
          View Details →
        </Link>
      </div>
    </div>
  );
}
