import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import { PayButton } from '@/features/payments/components/pay-button';
import { CancelBookingButton } from '@/features/bookings/components/cancel-booking-button';
import { RescheduleButton } from '@/features/bookings/components/reschedule-button';
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
    ? await db.from('bookings').select('id, period, amount, status, payment, starts_at, centres(name)').eq('booking_group_id', id).order('starts_at')
    : await db.from('bookings').select('id, period, amount, status, payment, starts_at, centres(name)').eq('id', id).then((r) => ({ data: r.data ?? [] }));

  if (!bookings || bookings.length === 0) notFound(); // RLS also scopes to owner

  const centre = bookings[0]!.centres as unknown as { name: string } | null;
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.amount), 0);
  const unpaidAmount = bookings.filter((b) => b.payment !== 'paid').reduce((sum, b) => sum + Number(b.amount), 0);
  const allPaid = bookings.every((b) => b.payment === 'paid');
  const isGroupBooking = group === '1' && bookings.length > 1;
  const bookingIds = bookings.map((b) => b.id);
  const allCancellable = bookings.every((b) => ['pending', 'confirmed'].includes(b.status));

  const bookingDate = new Date(bookings[0]!.starts_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
  const refCode = `SN-${bookings[0]!.id.slice(0, 8).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/centres/${slug}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← {centre?.name ?? 'Back to centre'}</Link>
        <h1 className="font-display text-xl font-bold sm:text-2xl">{centre?.name}</h1>
        {allCancellable ? <CancelBookingButton bookingIds={bookingIds} /> : <span />}
      </div>
      <p className="mt-1 text-center text-sm text-muted-foreground sm:text-left">
        Booking Date: {bookingDate} · <span className="font-mono text-xs">{refCode}</span>
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Left — confirmation details */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d6c4f] text-sm text-white" aria-hidden>✓</span>
              <h2 className="font-display text-lg font-bold text-[#2d6c4f]">Booking Confirmed</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your {bookings.length > 1 ? `${bookings.length} seats` : 'seat'} at <span className="font-semibold text-foreground">{centre?.name}</span> {bookings.length > 1 ? 'are' : 'is'} reserved.
              {allPaid ? ' Payment is complete.' : ' Complete payment to fully secure your spot.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/40 p-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {bookings.length > 1 ? 'First slot begins' : 'Scheduled for'}
                </p>
                <p className="text-sm font-semibold">
                  {new Date(bookings[0]!.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
              {!isGroupBooking && allCancellable && <RescheduleButton bookingId={bookings[0]!.id} />}
            </div>

            {bookings.length > 1 && (
              <div className="mt-4 divide-y border-t">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      {new Date(b.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}
                      {' '}— {formatINR(Number(b.amount))}
                    </span>
                    <span className={b.payment === 'paid' ? 'text-xs font-semibold text-[#2d6c4f]' : 'rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700'}>
                      {b.payment === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold">Need our help?</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Call or write to us if something's not right.</p>
              </div>
              <a href="mailto:support@studynook.app" className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-secondary">
                ✉ support@studynook.app
              </a>
            </div>
          </Card>
        </div>

        {/* Right — payment summary */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-base font-bold">Payment Summary</h2>
            <div className="mt-3 space-y-2 border-b pb-3 text-sm">
              {bookings.map((b) => (
                <div key={b.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {bookings.length > 1
                      ? new Date(b.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
                      : `${b.period.charAt(0).toUpperCase()}${b.period.slice(1)} booking`}
                  </span>
                  <span>{formatINR(Number(b.amount))}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Amount to pay</span>
              <span className="font-display text-xl font-bold">{formatINR(allPaid ? 0 : unpaidAmount)}</span>
            </div>

            {!allPaid ? (
              <div className="mt-4">
                {isGroupBooking ? <PayButton groupId={id} /> : <PayButton bookingId={bookings[0]!.id} />}
                {isGroupBooking && <p className="mt-2 text-xs text-muted-foreground">Pays the remaining {formatINR(unpaidAmount)} for all unpaid hours in one go.</p>}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#2d6c4f]/10 px-3 py-2 text-center text-sm font-semibold text-[#2d6c4f]">✓ Fully paid</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link href="/centres" className="rounded-md border px-4 py-2 text-sm font-semibold">Browse more</Link>
        <Link href={`/centres/${slug}`} className="rounded-md bg-[#2d6c4f] px-4 py-2 text-sm font-bold text-white hover:bg-[#2d6c4f]/90">Back to centre</Link>
      </div>
    </main>
  );
}
