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

type HourSlot = { hour: number; taken: number; capacity: number; is_available: boolean; is_past: boolean };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const todayISO = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
const maxDateISO = () => new Date(Date.now() + IST_OFFSET_MS + 30 * 86_400_000).toISOString().slice(0, 10); // 30-day booking horizon

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

/**
 * Real slot picker for every period, not just hourly: a Daily or Monthly
 * booking still starts at a specific time of day, and picking "3 PM" is
 * checked against actual overlapping bookings before you can confirm — a
 * taken 3 PM slot shows as unavailable and reduces the free count, the same
 * way a specific hourly slot does. The same check runs again server-side in
 * book_seat() at the moment of booking, so a slot that fills between your
 * load and your click is still caught correctly.
 */
export function BookingPanel({ centreId, slug, resources }: { centreId: string; slug: string; resources: ResourceOpt[] }) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [period, setPeriod] = useState<Period>('month');
  const [date, setDate] = useState(todayISO());
  const [hour, setHour] = useState<number | null>(null);
  const [slots, setSlots] = useState<HourSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = resources.find((r) => r.id === resourceId);
  const periods = selected ? (Object.keys(selected.pricing) as Period[]).filter((p) => p in PERIOD_LABEL) : [];
  const amount = selected?.pricing[period];

  useEffect(() => {
    if (!resourceId || !date || !period) return;
    setHour(null);
    setLoadingSlots(true);
    getResourceAvailability({ resourceId, period, date }).then((res) => {
      setSlots(res.ok ? res.data.slots : []);
      setLoadingSlots(false);
    });
  }, [resourceId, period, date]);

  const chosenSlot = hour !== null ? slots.find((s) => s.hour === hour) : undefined;
  const canBook = typeof amount === 'number' && !!chosenSlot?.is_available;

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
        <label htmlFor="booking-date" className="mb-2 block text-sm font-medium">
          {period === 'month' ? 'Start date' : 'Date'}
        </label>
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

      <div>
        <p className="mb-2 text-sm font-medium">
          {period === 'hour' ? 'Time slot' : 'Start time'}
        </p>
        {loadingSlots ? (
          <p className="text-sm text-muted-foreground">Checking availability…</p>
        ) : slots.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.hour}
                  type="button"
                  disabled={!s.is_available}
                  aria-pressed={hour === s.hour}
                  onClick={() => setHour(s.hour)}
                  title={s.is_past ? 'Already passed' : !s.is_available ? 'Fully booked' : undefined}
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
            {chosenSlot && (
              <p className={`mt-2 text-sm font-medium ${chosenSlot.is_available ? 'text-brand-green' : 'text-destructive'}`}>
                {chosenSlot.capacity - chosenSlot.taken} of {chosenSlot.capacity} seats free at {formatHour(chosenSlot.hour)}
                {period !== 'hour' && ` (for the full ${period === 'day' ? 'day' : 'month'})`}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No slots configured for this date.</p>
        )}
      </div>

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
