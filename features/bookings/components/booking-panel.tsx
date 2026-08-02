'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatINR, cn } from '@/lib/utils';
import { createBooking, getResourceAvailability } from '../actions';
import { PERIOD_LABEL, PERIOD_DAYS, priceForPeriod, availablePeriods, type Period } from '../pricing';
import { SaveButton } from '@/features/saved/components/save-button';

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
function formatDateShort(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/**
 * Real slot picker — same booking engine as before, laid out as a two-column
 * page (numbered steps + a live booking-summary sidebar) instead of one
 * stacked column. Every behaviour below is unchanged from the previous
 * version: hourly multi-select, per-hour independent capacity, real-time
 * availability re-checked at the moment of booking, 30-day horizon, etc.
 */
export function BookingPanel({
  centreId, slug, resources, initialPeriod, initialResourceId,
  centreName, centreArea, coverUrl, rating, phone, whatsapp, initialSaved, cancelCutoffHours,
}: {
  centreId: string; slug: string; resources: ResourceOpt[]; initialPeriod?: Period; initialResourceId?: string;
  centreName: string; centreArea: string | null; coverUrl: string | null; rating: number;
  phone: string | null; whatsapp: string | null; initialSaved: boolean; cancelCutoffHours: number;
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const selected = resources.find((r) => r.id === resourceId);
  const periods = useMemo(() => (selected ? availablePeriods(selected.pricing) : []), [selected]);
  const perUnitAmount = selected ? priceForPeriod(selected.pricing, period) : null;
  const isMultiHour = period === 'hour';
  const totalAmount = isMultiHour && perUnitAmount !== null ? perUnitAmount * selectedHours.length : perUnitAmount;
  // For day+ periods every returned row reports the same taken/capacity —
  // the whole period lives or dies on one shared, date-level availability
  // check, not a specific hour. Read the first row as that single flag.
  const dayAvailable = !isMultiHour && slots.length > 0 ? slots[0]!.is_available : false;

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

  const canBook = agreedToTerms && (isMultiHour
    ? selectedHours.length > 0 && perUnitAmount !== null
    : perUnitAmount !== null && dayAvailable && !closed);

  const endDate = !isMultiHour && period !== 'day' ? addDays(date, PERIOD_DAYS[period] ?? 1) : null;

  const book = async () => {
    setError(null); setBusy(true);
    const res = await createBooking({
      centreId, resourceId, period, date,
      // Day+ bookings don't ask for an hour at all now — the period's real
      // constraint is per-day, not per-hour (see resource_day_plus_count).
      hour: isMultiHour ? selectedHours[0] : undefined,
      hours: isMultiHour ? selectedHours : undefined,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    const groupParam = res.data.isGroup ? '&group=1' : '';
    router.push(`/centres/${slug}/book/confirmed?id=${res.data.id}${groupParam}`);
    router.refresh();
  };

  const startTimeLabel = selectedHours.length === 0 ? '—' : selectedHours.map(formatHour).join(', ');

  return (
    <div className="mt-6">
      {/* Trust strip */}
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">✅ Instant confirmation</span>
        <span className="inline-flex items-center gap-1.5">🔒 Secure payment</span>
        <span className="inline-flex items-center gap-1.5">💳 No hidden charges</span>
        <span className="inline-flex items-center gap-1.5">↩️ Easy cancellation</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left — the booking form itself, unchanged logic, numbered steps */}
        <div className="space-y-6">
          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
              Choose seating type
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {resources.map((r) => (
                <button key={r.id} type="button" onClick={() => setResourceId(r.id)} aria-pressed={resourceId === r.id} className="text-left">
                  <Card className={cn('flex items-center gap-3 p-4 transition', resourceId === r.id ? 'ring-2 ring-primary' : 'hover:shadow-md')}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg" aria-hidden>🪑</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display font-semibold">{r.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.tier ?? 'Seat'}</span>
                    </span>
                    {resourceId === r.id && <span className="ml-auto shrink-0 text-primary" aria-hidden>✓</span>}
                  </Card>
                </button>
              ))}
            </div>
          </Card>

          {periods.length > 0 && (
            <Card className="p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
                Choose duration
              </p>
              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    aria-pressed={period === p}
                    className={cn(
                      'relative rounded-lg border px-4 py-2 text-sm font-semibold',
                      period === p ? 'border-primary bg-accent text-foreground' : 'border-input text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {p === 'month' && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Popular</span>
                    )}
                    {PERIOD_LABEL[p]} · {formatINR(priceForPeriod(selected!.pricing, p)!)}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
              Select start date
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
                <p className="text-sm text-muted-foreground">
                  Ends on <span className="font-medium text-foreground">{formatDateLong(endDate)}</span>
                </p>
              )}
            </div>
            <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
              ℹ️ You can cancel or modify your booking anytime.
            </p>
          </Card>

          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">4</span>
              {isMultiHour ? 'Select start time (choose one or more)' : 'Availability'}
            </p>
            {loadingSlots ? (
              <p className="text-sm text-muted-foreground">Checking availability…</p>
            ) : closed ? (
              <p className="text-sm font-medium text-destructive">
                Closed on {new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}s — pick another date.
              </p>
            ) : !isMultiHour ? (
              // Daily/Weekly/Fortnightly/Monthly/Quarterly/Half-yearly/Yearly:
              // no time-of-day concept — a day+ booking occupies the seat for
              // the whole day, every day in the period, so there's nothing
              // meaningful to pick an "hour" for. Show one clear status
              // instead of a grid of hour buttons that don't actually affect
              // whether the booking can be made.
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold',
                dayAvailable ? 'bg-status-free/10 text-status-free' : 'bg-status-full/10 text-status-full',
              )}>
                <span className={cn('h-2.5 w-2.5 rounded-full', dayAvailable ? 'bg-status-free' : 'bg-status-full')} aria-hidden />
                {dayAvailable ? `Available for ${PERIOD_LABEL[period]}` : 'Fully booked for this period — try another date.'}
              </div>
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
            {isMultiHour && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-free align-middle" /> Available</span>
                <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-status-full align-middle" /> Fully booked</span>
                <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-secondary align-middle" /> Past</span>
              </p>
            )}
          </Card>

          {(phone || whatsapp) && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">Need help?</p>
                <p className="text-sm text-muted-foreground">Chat with us on WhatsApp or call us for assistance.</p>
              </div>
              <div className="flex gap-2">
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 px-4 py-2 text-sm font-semibold text-[#128C36] hover:bg-[#25D366]/5">
                    💬 WhatsApp
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-secondary">
                    📞 Call us
                  </a>
                )}
              </div>
            </Card>
          )}

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>

        {/* Right — live booking summary, matching the reference's sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden p-0">
            <div className="relative h-32 w-full bg-secondary">
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-xs font-bold">
                ★ {rating.toFixed(1)}
              </span>
            </div>
            <div className="p-4">
              <p className="font-display font-bold">{centreName}</p>
              <p className="text-xs text-muted-foreground">📍 {centreArea ?? '—'}</p>
            </div>
          </Card>

          <Card className="p-4 text-sm">
            <p className="mb-2 font-semibold">Booking summary</p>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Seating type</dt><dd>{selected?.label ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd>{PERIOD_LABEL[period]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Start date</dt><dd>{formatDateShort(date)}</dd></div>
              {endDate && <div className="flex justify-between"><dt className="text-muted-foreground">End date</dt><dd>{formatDateShort(endDate)}</dd></div>}
              {isMultiHour && <div className="flex justify-between"><dt className="text-muted-foreground">Start time</dt><dd className="text-right">{startTimeLabel}</dd></div>}
            </dl>

            <div className="mt-3 space-y-1.5 border-t pt-3">
              <div className="flex justify-between"><dt className="text-muted-foreground">Price</dt><dd>{perUnitAmount !== null ? formatINR(perUnitAmount) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{typeof totalAmount === 'number' ? formatINR(totalAmount) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Taxes &amp; fees</dt><dd>₹0</dd></div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-accent px-3 py-2">
              <span className="text-sm font-semibold text-muted-foreground">Total amount</span>
              <span className="font-display text-lg font-bold">{typeof totalAmount === 'number' ? formatINR(totalAmount) : '—'}</span>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">🔒 Secured by Razorpay</p>

            <div className="mt-3 space-y-1 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <p><strong className="text-foreground">Cancellation policy:</strong> Free cancellation up to {cancelCutoffHours} hour{cancelCutoffHours === 1 ? '' : 's'} before your booking&apos;s start time.</p>
              <p><strong className="text-foreground">Refund policy:</strong> Refunds for eligible cancellations are processed to your original payment method.</p>
              <p><strong className="text-foreground">Reservation hold:</strong> Your seat is held temporarily once you confirm below — complete payment before the hold expires or it&apos;s released automatically.</p>
            </div>

            <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
              I agree to the <Link href="/terms" className="underline hover:no-underline">Terms &amp; Conditions</Link> and the cancellation/refund policy above.
            </label>

            <Button onClick={book} disabled={busy || !canBook} className="mt-3 w-full">
              {busy ? 'Booking…' : 'Confirm booking'}
            </Button>
            <div className="mt-2">
              <SaveButton centreId={centreId} initialSaved={initialSaved} />
            </div>

            <p className="mt-3 rounded-lg bg-secondary/50 p-2.5 text-xs text-muted-foreground">
              Your seat is reserved only after payment confirmation.
            </p>
          </Card>
        </div>
      </div>

      {/* Bottom trust footer */}
      <div className="mt-8 grid gap-4 border-t pt-6 sm:grid-cols-4">
        {[
          ['✅', 'Instant confirmation', 'Get booking confirmed immediately'],
          ['🔒', 'Secure payment', '100% safe & secure payments'],
          ['↩️', 'Easy cancellation', 'Cancel or modify anytime'],
          ['📡', 'Live availability', 'Real seat counts, always up to date'],
        ].map(([icon, title, body]) => (
          <div key={title} className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-base" aria-hidden>{icon}</span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
