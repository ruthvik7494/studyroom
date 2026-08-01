'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatINR, cn } from '@/lib/utils';
import { createBooking, getResourceAvailability } from '../actions';
import { PERIOD_LABEL, PERIOD_DAYS, priceForPeriod, availablePeriods, type Period } from '../pricing';

interface ResourceOpt { id: string; label: string; tier: string | null; pricing: Record<string, number> }

type HourSlot = { hour: number; taken: number; capacity: number; is_available: boolean; is_past: boolean };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const todayISO = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
const maxDateISO = () => new Date(Date.now() + IST_OFFSET_MS + 30 * 86_400_000).toISOString().slice(0, 10); // 30-day booking horizon

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLong(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * Real slot picker. Hourly bookings support selecting several hours at once
 * (e.g. 9, 10, 11 AM for a 3-hour session) — each hour is checked and booked
 * as its own independent seat, so "9 AM has 2 of 3 left" stays correct
 * regardless of what's booked at 10 AM or 11 AM. Day-or-longer bookings pick
 * one start time and show a calculated end date. Slots are colour-coded:
 * green = available (hover for the seat count), red = fully booked, gray =
 * already past — checked again server-side at the moment of booking, so a
 * slot that fills between page load and click is still caught correctly.
 */
export function BookingPanel({
  centreId, slug, resources, initialPeriod, initialResourceId,
}: {
  centreId: string; slug: string; resources: ResourceOpt[]; initialPeriod?: Period; initialResourceId?: string;
}) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(
    (initialResourceId && resources.some((r) => r.id === initialResourceId)) ? initialResourceId : (resources[0]?.id ?? ''),
  );
  const [period, setPeriod] = useState<Period>(initialPeriod ?? 'month');
  const [date, setDate] = useState(todayISO());
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [slots, setSlots] = useState<HourSlot[]>([]);
  const [closed, setClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = resources.find((r) => r.id === resourceId);
  const periods = useMemo(() => (selected ? availablePeriods(selected.pricing) : []), [selected]);
  const perUnitAmount = selected ? priceForPeriod(selected.pricing, period) : null;
  const isMultiHour = period === 'hour';
  const totalAmount = isMultiHour && perUnitAmount !== null ? perUnitAmount * selectedHours.length : perUnitAmount;

  useEffect(() => {
    if (!resourceId || !date || !period) return;
    setSelectedHours([]);
    setLoadingSlots(true);
    getResourceAvailability({ resourceId, period, date }).then((res) => {
      setSlots(res.ok ? res.data.slots : []);
      setClosed(res.ok ? res.data.closed : false);
      setLoadingSlots(false);
    });
  }, [resourceId, period, date]);

  const toggleHour = (hour: number, available: boolean) => {
    if (!available) return;
    setSelectedHours((prev) => (prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)));
  };

  const canBook = isMultiHour
    ? selectedHours.length > 0 && perUnitAmount !== null
    : selectedHours.length === 1 && perUnitAmount !== null && slots.find((s) => s.hour === selectedHours[0])?.is_available;

  const endDate = !isMultiHour && period !== 'day' ? addDays(date, PERIOD_DAYS[period] ?? 1) : null;

  const book = async () => {
    setError(null); setBusy(true);
    const res = await createBooking({
      centreId, resourceId, period, date,
      hour: isMultiHour ? undefined : selectedHours[0],
      hours: isMultiHour ? selectedHours : undefined,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    const groupParam = res.data.isGroup ? '&group=1' : '';
    router.push(`/centres/${slug}/book/confirmed?id=${res.data.id}${groupParam}`);
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
                {PERIOD_LABEL[p]} · {formatINR(priceForPeriod(selected!.pricing, p)!)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="booking-date" className="mb-2 block text-sm font-medium">
          {period === 'day' || period === 'hour' ? 'Date' : 'Start date'}
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
        {endDate && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ends <span className="font-medium text-foreground">{formatDateLong(endDate)}</span>
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          {isMultiHour ? 'Time slots (select one or more)' : 'Start time'}
        </p>
        {loadingSlots ? (
          <p className="text-sm text-muted-foreground">Checking availability…</p>
        ) : closed ? (
          <p className="text-sm font-medium text-destructive">
            Closed on {new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}s — pick another date.
          </p>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const isSelected = selectedHours.includes(s.hour);
              const seatsFree = s.capacity - s.taken;
              const title = s.is_past
                ? 'Already passed'
                : !s.is_available
                  ? 'Seat unavailable'
                  : `${seatsFree} of ${s.capacity} seat${s.capacity === 1 ? '' : 's'} available`;
              return (
                <button
                  key={s.hour}
                  type="button"
                  disabled={!s.is_available}
                  aria-pressed={isSelected}
                  onClick={() => toggleHour(s.hour, s.is_available)}
                  title={title}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                    s.is_past && 'cursor-not-allowed border-transparent bg-secondary text-muted-foreground/60',
                    !s.is_past && !s.is_available && 'cursor-not-allowed border-transparent bg-status-full text-white',
                    !s.is_past && s.is_available && !isSelected && 'border-transparent bg-status-free text-white hover:opacity-80',
                    !s.is_past && s.is_available && isSelected && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {formatHour(s.hour)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No slots configured for this date.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-free align-middle" /> Available</span>
          <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-full align-middle" /> Fully booked</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-secondary align-middle" /> Past</span>
        </p>
      </div>

      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">Total{isMultiHour && selectedHours.length > 1 ? ` (${selectedHours.length} hours)` : ''}</p>
          <p className="font-display text-xl font-bold text-brand-green">{typeof totalAmount === 'number' ? formatINR(totalAmount) : '—'}</p>
        </div>
        <Button onClick={book} disabled={busy || !canBook}>{busy ? 'Booking…' : 'Confirm booking'}</Button>
      </Card>

      <p className="text-xs text-muted-foreground">Payment is collected at the centre or online once your booking is confirmed.</p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
