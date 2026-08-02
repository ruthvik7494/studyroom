import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import { PERIOD_LABEL, type Period } from '@/features/bookings/pricing';
import { PayButton } from '@/features/payments/components/pay-button';
import { CancelBookingButton } from '@/features/bookings/components/cancel-booking-button';
import { RescheduleButton } from '@/features/bookings/components/reschedule-button';
import { CopyBookingId } from '@/features/bookings/components/copy-booking-id';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Booking confirmed', ...noindex };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ id?: string; group?: string }> };

export default async function ConfirmedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { id, group } = await searchParams;
  await requireUser();
  if (!id) notFound();

  const db = await createClient();

  // A multi-hour booking (2+ hours) returns a group id from book_seat_multi
  // instead of a single booking id — look up every row in that group.
  const { data: bookings } = group === '1'
    ? await db.from('bookings').select('id, period, amount, status, payment, starts_at, centres(name, slug, area, cover_url, rating, is_verified)').eq('booking_group_id', id).order('starts_at')
    : await db.from('bookings').select('id, period, amount, status, payment, starts_at, centres(name, slug, area, cover_url, rating, is_verified)').eq('id', id).then((r) => ({ data: r.data ?? [] }));

  if (!bookings || bookings.length === 0) notFound(); // RLS also scopes to owner

  const centre = bookings[0]!.centres as unknown as { name: string; slug: string; area: string | null; cover_url: string | null; rating: number; is_verified: boolean } | null;
  const unpaidAmount = bookings.filter((b) => b.payment !== 'paid').reduce((sum, b) => sum + Number(b.amount), 0);
  const subtotal = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const allPaid = bookings.every((b) => b.payment === 'paid');
  const isGroupBooking = group === '1' && bookings.length > 1;
  const bookingIds = bookings.map((b) => b.id);
  const allCancellable = bookings.every((b) => ['pending', 'confirmed'].includes(b.status));

  const firstStart = new Date(bookings[0]!.starts_at);
  const lastBooking = bookings[bookings.length - 1]!;
  const lastStart = new Date(lastBooking.starts_at);
  const period = bookings[0]!.period as Period;
  const isHourly = period === 'hour';
  // For hourly bookings, the visible "time range" spans from the first slot's
  // start to one hour after the last slot's start (each slot is exactly 1hr).
  const rangeEnd = isHourly ? new Date(lastStart.getTime() + 60 * 60 * 1000) : null;

  const fmtTime = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
  const fmtDateShort = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  const bookingDate = firstStart.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
  const refCode = `SN-${bookings[0]!.id.slice(0, 8).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2d6c4f] text-4xl text-white shadow-lg" aria-hidden>✓</span>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Booking Confirmed! 🎉</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your {bookings.length > 1 ? `${bookings.length} seats` : 'seat'} at <span className="font-semibold text-foreground">{centre?.name}</span> {bookings.length > 1 ? 'have' : 'has'} been reserved.
          {allPaid ? ' Payment is complete.' : ' Complete payment to secure your booking.'}
        </p>
      </div>

      <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Booking ID</span>
          <span className="font-mono font-semibold">{refCode}</span>
          <CopyBookingId text={refCode} />
        </div>
        <div>
          <span className="text-muted-foreground">Booking Date</span>{' '}
          <span className="font-semibold">{bookingDate} · {fmtTime(firstStart)}</span>
        </div>
      </div>

      {allCancellable && (
        <div className="mt-4 flex justify-center">
          <CancelBookingButton bookingIds={bookingIds} slug={slug} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>📅</span>
              Your booking details
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Centre</p>
                <p className="text-sm font-semibold">{centre?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-semibold">{fmtDateShort(firstStart)}, {firstStart.getFullYear()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-semibold">{isHourly ? `${fmtTime(firstStart)} – ${fmtTime(rangeEnd!)}` : fmtTime(firstStart)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold">{isHourly && bookings.length > 1 ? `${bookings.length} Hours` : PERIOD_LABEL[period]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-semibold">General seating</p>
              </div>
            </div>

            {bookings.length > 1 && (
              <div className="mt-4 divide-y border-t">
                {bookings.map((b) => {
                  const canReschedule = ['pending', 'confirmed'].includes(b.status);
                  return (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <span>{fmtTime(new Date(b.starts_at))} — {formatINR(Number(b.amount))}</span>
                      <div className="flex items-center gap-2">
                        <span className={b.payment === 'paid' ? 'text-xs font-semibold text-[#2d6c4f]' : 'rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700'}>
                          {b.payment === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                        {canReschedule && <RescheduleButton bookingId={b.id} slug={slug} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {bookings.length === 1 && allCancellable && (
              <div className="mt-4 flex justify-end border-t pt-4">
                <RescheduleButton bookingId={bookings[0]!.id} slug={slug} />
              </div>
            )}
          </Card>

          <div>
            <p className="mb-3 font-semibold">What&apos;s next?</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['✉️', 'Payment', 'Complete the payment to confirm your booking.'],
                ['🏢', 'Visit the Centre', 'Show up at your booked time — no other check-in step needed.'],
                ['📖', 'Enjoy Your Study', 'Focus, learn and achieve your goals.'],
              ].map(([icon, title, body]) => (
                <div key={title} className="rounded-xl bg-secondary/40 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>{icon}</span>
                  <p className="mt-2 text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 bg-secondary/30 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground" aria-hidden>🎧</span>
              <div>
                <p className="font-semibold">Need help?</p>
                <p className="text-sm text-muted-foreground">Call or write to us if something&apos;s not right.</p>
              </div>
            </div>
            <a href="mailto:support@studynook.app" className="rounded-full border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary">
              ✉ Email Support
            </a>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-4 bg-primary/5 p-5">
            <div>
              <p className="font-semibold">Keep learning, keep growing! 🌱</p>
              <p className="text-sm text-muted-foreground">Find the perfect study space that inspires your best.</p>
            </div>
            <Link href="/centres" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Browse more centres →
            </Link>
          </Card>
        </div>

        {/* Right — payment summary + centre card */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Payment Summary</h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d6c4f]">
                <svg aria-hidden viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z" /></svg>
                Secure Payment
              </span>
            </div>
            <div className="mt-3 space-y-2 border-b pb-3 text-sm">
              {bookings.map((b) => (
                <div key={b.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {bookings.length > 1
                      ? fmtTime(new Date(b.starts_at))
                      : `${b.period === 'hour' ? 'Hour' : PERIOD_LABEL[b.period as Period]} booking`}
                  </span>
                  <span>₹{Number(b.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sub Total</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  Platform Fee
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/40 text-[9px]" title="StudyNook doesn't add any platform fee on top of the listed price.">i</span>
                </span>
                <span>₹0.00</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
              <span className="text-sm font-semibold">Amount to pay</span>
              <span className="font-display text-xl font-bold">₹{(allPaid ? 0 : unpaidAmount).toFixed(2)}</span>
            </div>

            {!allPaid ? (
              <div className="mt-4">
                {isGroupBooking ? <PayButton groupId={id} /> : <PayButton bookingId={bookings[0]!.id} />}
                {isGroupBooking && <p className="mt-2 text-xs text-muted-foreground">Pays the remaining {formatINR(unpaidAmount)} for all unpaid hours in one go.</p>}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#2d6c4f]/10 px-3 py-2 text-center text-sm font-semibold text-[#2d6c4f]">✓ Fully paid</p>
            )}

            <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              We accept
              <span className="inline-flex items-center gap-1">
                <span className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-bold text-[#097939]">UPI</span>
                <span className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-bold italic text-[#1A1F71]">VISA</span>
                <span className="inline-flex items-center gap-[-2px]" title="Mastercard">
                  <span className="inline-block h-3 w-3 rounded-full bg-[#EB001B]" />
                  <span className="-ml-1.5 inline-block h-3 w-3 rounded-full bg-[#F79E1B] opacity-90" />
                </span>
                <span className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-bold italic text-[#00396D]">RuPay</span>
              </span>
              &amp; more
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center text-[11px] text-muted-foreground">
              <span className="flex flex-col items-center gap-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d6c4f] text-xs text-white" aria-hidden>✓</span>
                Instant<br />confirmation
              </span>
              <span className="flex flex-col items-center gap-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white" aria-hidden>🔒</span>
                100% Secure<br />payment
              </span>
              <span className="flex flex-col items-center gap-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs" aria-hidden>ⓘ</span>
                No hidden<br />charges
              </span>
            </div>
          </Card>

          {centre && (
            <Card className="overflow-hidden p-0">
              <div className="relative h-28 w-full bg-secondary">
                {centre.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={centre.cover_url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-xs font-bold">★ {centre.rating.toFixed(1)}</span>
              </div>
              <div className="p-4">
                <p className="flex items-center gap-1.5 font-display font-bold">
                  {centre.name}
                  {centre.is_verified && <span className="text-primary" title="Verified Centre">✓</span>}
                </p>
                <p className="text-xs text-muted-foreground">📍 {centre.area ?? '—'}</p>
                <Link href={`/centres/${centre.slug}`} className="mt-3 block rounded-lg border py-2 text-center text-sm font-semibold hover:bg-secondary">
                  View centre details →
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
