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
        <div className="space-y-6 font-sans">
          <Card className="p-6 border border-[#bdcaba]/40 shadow-xs">
            <p className="mb-4 flex items-center gap-2.5 font-['Lexend',sans-serif] text-sm font-bold text-[#191c1e] uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16a34a] text-xs font-bold text-white">1</span>
              Choose space category
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {resources.map((r) => (
                <button key={r.id} type="button" onClick={() => setResourceId(r.id)} aria-pressed={resourceId === r.id} className="text-left cursor-pointer">
                  <div className={cn('flex items-center justify-between p-4 rounded-xl border transition-all', resourceId === r.id ? 'border-[#16a34a] bg-[#16a34a]/5 ring-1 ring-[#16a34a]' : 'border-[#bdcaba]/40 hover:border-[#191c1e] bg-white')}>
                    <span className="min-w-0">
                      <span className="block truncate font-['Lexend',sans-serif] font-bold text-sm text-[#191c1e]">{r.label}</span>
                      {r.tier && <span className="block truncate text-xs text-[#565e74]">{r.tier}</span>}
                    </span>
                    {resourceId === r.id && <span className="shrink-0 text-[#16a34a] font-bold" aria-hidden>✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {periods.length > 0 && (
            <Card className="p-6 border border-[#bdcaba]/40 shadow-xs">
              <p className="mb-4 flex items-center gap-2.5 font-['Lexend',sans-serif] text-sm font-bold text-[#191c1e] uppercase tracking-wide">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16a34a] text-xs font-bold text-white">2</span>
                Choose duration
              </p>
              <div className="flex flex-wrap gap-2.5">
                {periods.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    aria-pressed={period === p}
                    className={cn(
                      'relative rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                      period === p ? 'border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a] shadow-xs' : 'border-[#bdcaba]/60 text-[#565e74] hover:border-[#191c1e] hover:text-[#191c1e] bg-white',
                    )}
                  >
                    {p === 'month' && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#16a34a] px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-widest">Popular</span>
                    )}
                    {PERIOD_LABEL[p]} · {formatINR(priceForPeriod(selected!.pricing, p)!)}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6 border border-[#bdcaba]/40 shadow-xs">
            <p className="mb-4 flex items-center gap-2.5 font-['Lexend',sans-serif] text-sm font-bold text-[#191c1e] uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16a34a] text-xs font-bold text-white">3</span>
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
                className="h-10 rounded-xl border border-[#bdcaba] bg-[#f8faf8] px-3.5 text-xs font-semibold text-[#191c1e] focus:outline-none focus:border-[#16a34a]"
              />
              {endDate && (
                <p className="text-xs text-[#565e74]">
                  Ends on <span className="font-bold text-[#191c1e]">{formatDateLong(endDate)}</span>
                </p>
              )}
            </div>
            <p className="mt-3 rounded-lg bg-[#16a34a]/10 border border-[#16a34a]/20 px-3 py-2 text-xs font-semibold text-[#16a34a]">
              ℹ️ You can cancel or modify your booking anytime.
            </p>
          </Card>

          <Card className="p-6 border border-[#bdcaba]/40 shadow-xs">
            <p className="mb-4 flex items-center gap-2.5 font-['Lexend',sans-serif] text-sm font-bold text-[#191c1e] uppercase tracking-wide">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16a34a] text-xs font-bold text-white">4</span>
              {isMultiHour ? 'Select start time (choose one or more)' : 'Availability'}
            </p>
            {loadingSlots ? (
              <p className="text-xs text-[#565e74]">Checking availability…</p>
            ) : closed ? (
              <p className="text-xs font-bold text-rose-600">
                Closed on {new Date(`${date}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}s — pick another date.
              </p>
            ) : !isMultiHour ? (
              <div className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider',
                dayAvailable ? 'bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/30' : 'bg-rose-50 text-rose-700 border border-rose-200',
              )}>
                <span className={cn('h-2.5 w-2.5 rounded-full', dayAvailable ? 'bg-[#16a34a]' : 'bg-rose-600')} aria-hidden />
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
                        'rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                        s.is_past && 'cursor-not-allowed border-transparent bg-slate-100 text-slate-400',
                        !s.is_past && !s.is_available && 'cursor-not-allowed border-transparent bg-rose-500 text-white',
                        !s.is_past && s.is_available && !isSelected && 'border-[#bdcaba]/60 bg-white text-[#191c1e] hover:border-[#16a34a]',
                        !s.is_past && s.is_available && isSelected && 'border-[#16a34a] bg-[#16a34a] text-white shadow-xs',
                      )}
                    >
                      {formatHour(s.hour)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#565e74]">No slots configured for this date.</p>
            )}
            {isMultiHour && (
              <p className="mt-3 text-[11px] text-[#565e74]">
                <span className="mr-3"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#16a34a] align-middle" /> Available</span>
                <span className="mr-3"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500 align-middle" /> Fully booked</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300 align-middle" /> Past</span>
              </p>
            )}
          </Card>

          {(phone || whatsapp) && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5 border border-[#bdcaba]/40 shadow-xs">
              <div>
                <p className="font-['Lexend',sans-serif] text-xs font-bold text-[#191c1e] uppercase tracking-wider">Need help?</p>
                <p className="text-xs text-[#565e74]">Chat with us on WhatsApp or call us for assistance.</p>
              </div>
              <div className="flex gap-2">
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors">
                    💬 WhatsApp
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors">
                    📞 Call us
                  </a>
                )}
              </div>
            </Card>
          )}

          {error && <p className="text-xs font-bold text-rose-600" role="alert">{error}</p>}
        </div>

        {/* Right — live booking summary, matching detail page sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden p-0 border border-[#bdcaba]/40 shadow-xs rounded-2xl">
            <div className="relative h-32 w-full bg-slate-100">
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#191c1e] shadow-xs">
                ★ {rating.toFixed(1)}
              </span>
            </div>
            <div className="p-4 bg-white">
              <p className="font-['Lexend',sans-serif] font-bold text-base text-[#191c1e]">{centreName}</p>
              <p className="text-xs text-[#565e74]">📍 {centreArea ?? '—'}</p>
            </div>
          </Card>

          <Card className="p-5 border border-[#bdcaba]/40 shadow-xs rounded-2xl bg-white text-xs">
            <p className="mb-3 font-['Lexend',sans-serif] text-xs font-bold text-[#191c1e] uppercase tracking-wider border-b border-[#f2f4f6] pb-2">Booking Summary</p>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-[#565e74]">Seating category</dt><dd className="font-bold text-[#191c1e]">{selected?.label ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-[#565e74]">Duration</dt><dd className="font-bold text-[#191c1e]">{PERIOD_LABEL[period]}</dd></div>
              <div className="flex justify-between"><dt className="text-[#565e74]">Start date</dt><dd className="font-semibold text-[#191c1e]">{formatDateShort(date)}</dd></div>
              {endDate && <div className="flex justify-between"><dt className="text-[#565e74]">End date</dt><dd className="font-semibold text-[#191c1e]">{formatDateShort(endDate)}</dd></div>}
              {isMultiHour && <div className="flex justify-between"><dt className="text-[#565e74]">Start time</dt><dd className="text-right font-semibold text-[#191c1e]">{startTimeLabel}</dd></div>}
            </dl>

            <div className="mt-4 space-y-2 border-t border-[#f2f4f6] pt-3">
              <div className="flex justify-between"><dt className="text-[#565e74]">Price</dt><dd className="font-semibold text-[#191c1e]">{perUnitAmount !== null ? formatINR(perUnitAmount) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-[#565e74]">Subtotal</dt><dd className="font-semibold text-[#191c1e]">{typeof totalAmount === 'number' ? formatINR(totalAmount) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-[#565e74]">Taxes &amp; fees</dt><dd className="font-semibold text-[#191c1e]">₹0</dd></div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#16a34a]/10 border border-[#16a34a]/20 p-3.5">
              <span className="text-xs font-bold text-[#16a34a] uppercase tracking-wider">Total Amount</span>
              <span className="font-['Lexend',sans-serif] text-xl font-bold text-[#16a34a]">{typeof totalAmount === 'number' ? formatINR(totalAmount) : '—'}</span>
            </div>

            <p className="mt-3 text-center text-[11px] text-[#565e74] font-medium">🔒 Secured by Razorpay</p>

            <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 border border-slate-200/60 p-3 text-[11px] text-[#565e74]">
              <p><strong className="text-[#191c1e]">Cancellation policy:</strong> Free cancellation up to {cancelCutoffHours} hour{cancelCutoffHours === 1 ? '' : 's'} before your booking&apos;s start time.</p>
              <p><strong className="text-[#191c1e]">Refund policy:</strong> Refunds for eligible cancellations are processed to your original payment method.</p>
              <p><strong className="text-[#191c1e]">Reservation hold:</strong> Your seat is held temporarily once you confirm below — complete payment before the hold expires or it&apos;s released automatically.</p>
            </div>

            <label className="mt-4 flex items-start gap-2 text-[11px] text-[#565e74] cursor-pointer">
              <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-[#16a34a]" />
              I agree to the <Link href="/terms" className="underline font-semibold hover:text-[#191c1e]">Terms &amp; Conditions</Link> and policies above.
            </label>

            <button
              onClick={book}
              disabled={busy || !canBook}
              className="mt-4 w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-xs font-bold py-3.5 rounded-xl uppercase tracking-widest transition-colors shadow-xs cursor-pointer"
            >
              {busy ? 'Booking…' : 'Confirm Booking'}
            </button>
            <div className="mt-2">
              <SaveButton centreId={centreId} initialSaved={initialSaved} />
            </div>

            <p className="mt-3 text-center text-[11px] text-[#565e74]">
              Your seat is reserved only after payment confirmation.
            </p>
          </Card>
        </div>
      </div>

      {/* Bottom trust footer */}
      <div className="mt-12 grid gap-6 border-t border-[#bdcaba]/30 pt-8 sm:grid-cols-4">
        {[
          {
            title: 'Instant confirmation',
            body: 'Get booking confirmed immediately',
            icon: (
              <svg className="w-4 h-4 text-[#565e74]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            title: 'Secure payment',
            body: '100% safe & encrypted checkout',
            icon: (
              <svg className="w-4 h-4 text-[#565e74]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ),
          },
          {
            title: 'No hidden charges',
            body: 'Transparent pricing with zero extra fees',
            icon: (
              <svg className="w-4 h-4 text-[#565e74]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ),
          },
          {
            title: 'Easy cancellation',
            body: 'Cancel or modify your plan anytime',
            icon: (
              <svg className="w-4 h-4 text-[#565e74]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            ),
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#bdcaba]/20 border border-[#bdcaba]/30">
              {item.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">{item.title}</p>
              <p className="text-xs text-[#565e74] mt-0.5 leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
