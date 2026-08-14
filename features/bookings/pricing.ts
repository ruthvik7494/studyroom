/**
 * Shared between BookingPanel (client) and createBooking (server) — pure
 * computation, no DB access, safe on both sides of the boundary. Long-term
 * periods beyond Daily/Monthly (Weekly, Fortnightly, Quarterly, Half-yearly,
 * Yearly) are deliberately NOT separate owner-entered prices — that would
 * mean 8 separate price fields on the create/edit form, which is a lot to
 * ask an owner to fill in for periods most centres won't use. Instead they're
 * derived from whichever base rate the owner actually set (Daily or
 * Monthly), using standard multiples. If independent custom pricing per
 * period is wanted later, that's a real, separate feature — this is a
 * deliberate scope decision, not an oversight.
 */

export type Period = 'hour' | 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'half_year' | 'year';

export const PERIOD_LABEL: Record<Period, string> = {
  hour: 'Hourly',
  day: 'Daily',
  week: 'Weekly',
  fortnight: 'Fortnightly',
  month: 'Monthly',
  quarter: 'Quarterly',
  half_year: 'Half-yearly',
  year: 'Yearly',
};

/** Real length in days — matches the SQL period_days() function exactly. Hourly isn't listed; it never uses this. */
export const PERIOD_DAYS: Partial<Record<Period, number>> = {
  day: 1, week: 7, fortnight: 14, month: 30, quarter: 90, half_year: 182, year: 365,
};

const DERIVED_FROM: Partial<Record<Period, { base: 'day' | 'month'; factor: number }>> = {
  week: { base: 'day', factor: 7 },
  quarter: { base: 'month', factor: 3 },
  half_year: { base: 'month', factor: 6 },
  year: { base: 'month', factor: 12 },
};

/**
 * Price for a period: the owner's own rate if they set one directly
 * (hour/day/month), otherwise derived from Daily or Monthly via the
 * standard multiple above. Returns null if there's no way to price it
 * (e.g. asking for "week" when neither Daily nor Monthly is set).
 */
export function priceForPeriod(pricing: Record<string, number>, period: Period): number | null {
  if (typeof pricing[period] === 'number') return pricing[period]!;
  const rule = DERIVED_FROM[period];
  if (!rule) return null;
  const base = pricing[rule.base];
  return typeof base === 'number' ? base * rule.factor : null;
}

/** Every period the resource can actually be booked for, given its stored pricing. */
export function availablePeriods(pricing: Record<string, number>): Period[] {
  const all: Period[] = ['hour', 'day', 'week', 'month', 'quarter', 'half_year', 'year'];
  return all.filter((p) => priceForPeriod(pricing, p) !== null);
}
