'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatINR, cn } from '@/lib/utils';
import { createBooking, getResourceAvailability } from '../actions';

interface ResourceOpt { id: string; label: string; tier: string | null; pricing: Record<string, number> }
type Period = 'hour' | 'day' | 'month';
const PERIOD_LABEL: Record<Period, string> = { hour: 'Hourly', day: 'Daily', month: 'Monthly' };

type HourSlot = { hour: number; taken: number; capacity: number; is_available: boolean };
type Availability =
  | { kind: 'hourly'; slots: HourSlot[] }
  | { kind: 'single'; taken: number; capacity: number; isAvailable: boolean }
  | null;

const todayISO = () => new Date().toISOString().slice(0, 10);
const maxDateISO = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10); // 30-day booking horizon

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

/**
 * Real slot picker — a chosen date (and, for hourly bookings, a chosen hour)
 * is checked against actual overlapping bookings before you can confirm.
 * Taken slots are disabled, not just visually implied: the same check runs
 * again server-side in book_seat() at the moment of booking, so a slot that
 * fills between your load and your click is still caught correctly.
 */
export function BookingPanel({ centreId, slug, resources }: { centreId: string; slug: string; resources: ResourceOpt[] }) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [period, setPeriod] = useState<Period>('month');
  const [date, setDate] = useState(todayISO());
  const [hour, setHour] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Availability>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = resources.find((r) => r.id === resourceId);
  const periods = selected ? (Object.keys(selected.pricing) as Period[]).filter((p) => p in PERIOD_LABEL) : [];
  const amount = selected?.pricing[period];

  useEffect(() => {
    if (!resourceId || !date) return;
    setHour(null);
    setLoadingSlots(true);
    getResourceAvailability({ resourceId, period, date }).then((res) => {
      setAvailability(res.ok ? res.data : null);
      setLoadingSlots(false);
    });
  }, [resourceId, period, date]);

  const canBook =
    typeof amount === 'number' &&
    (period !== 'hour'
      ? availability?.kind === 'single' && availability.isAvailable
      : hour !== null && availability?.kind === 'hourly' && availability.slots.find((s) => s.hour === hour)?.is_available);

  const book = async () => {
    setError(null); setBusy(true);
    const res = await createBooking({ centreId, resourceId, period, date, hour: hour ?? undefined });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    router.push(`/centres/${slug}/book/confirmed?id=${res.data.id}`);
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Choose an option</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {resources.map((r) => (
            <button key={r.id} onClick={() => setResourceId(r.id)} aria-pressed={resourceId === r.id} className="text-left">
              <Card className={`p-4 transition ${resourceId === r.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
                <p className="font-display font-semibold">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.tier ?? 'Seat'}</p>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {periods.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Duration</p>
          <div className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p}
                className={`rounded-md border px-4 py-2 text-sm font-semibold ${period === p ? 'border-primary bg-accent text-foreground' : 'border-input text-muted-foreground'}`}>
                {PERIOD_LABEL[p]} · {formatINR(selected!.pricing[p]!)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="booking-date" className="mb-2 block text-sm font-medium">Date</label>
        <input
          id="booking-date"
          type="date"
          value={date}
          min={todayISO()}
          max={maxDateISO()}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {period === 'hour' ? (
        <div>
          <p className="mb-2 text-sm font-medium">Time slot</p>
          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">Checking availability…</p>
          ) : availability?.kind === 'hourly' && availability.slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availability.slots.map((s) => (
                <button
                  key={s.hour}
                  type="button"
                  disabled={!s.is_available}
                  aria-pressed={hour === s.hour}
                  onClick={() => setHour(s.hour)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    !s.is_available && 'cursor-not-allowed border-transparent bg-secondary/60 text-muted-foreground/50 line-through',
                    s.is_available && hour === s.hour && 'border-primary bg-primary text-primary-foreground',
                    s.is_available && hour !== s.hour && 'border-input hover:bg-secondary',
                  )}
                >
                  {formatHour(s.hour)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hourly slots configured for this date.</p>
          )}
        </div>
      ) : (
        availability?.kind === 'single' && !loadingSlots && (
          <p className={`text-sm font-medium ${availability.isAvailable ? 'text-brand-green' : 'text-destructive'}`}>
            {availability.isAvailable
              ? `${availability.capacity - availability.taken} of ${availability.capacity} available for this date`
              : 'Fully booked for this date — try another.'}
          </p>
        )
      )}

      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-display text-xl font-bold text-brand-green">{typeof amount === 'number' ? formatINR(amount) : '—'}</p>
        </div>
        <Button onClick={book} disabled={busy || !canBook}>{busy ? 'Booking…' : 'Confirm booking'}</Button>
      </Card>

      <p className="text-xs text-muted-foreground">Payment is collected at the centre or online once your booking is confirmed.</p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
