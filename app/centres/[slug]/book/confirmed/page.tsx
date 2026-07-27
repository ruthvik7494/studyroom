import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import { PayButton } from '@/features/payments/components/pay-button';
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

  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-free/15 text-status-free" aria-hidden>✓</div>
      <h1 className="mt-4 font-display text-2xl font-bold">Booking confirmed</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {bookings.length > 1 ? `Your ${bookings.length} seats at ${centre?.name} are reserved.` : `Your seat at ${centre?.name} is reserved.`}
      </p>

      <Card className="mt-6 p-5 text-left">
        {bookings.length > 1 && (
          <div className="mb-3 space-y-2 border-b pb-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span>
                  {new Date(b.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' '}— {formatINR(Number(b.amount))}
                </span>
                <span className={b.payment === 'paid' ? 'text-xs font-semibold text-brand-green' : 'text-xs text-muted-foreground'}>
                  {b.payment === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">Duration</span><span className="font-medium capitalize">{bookings[0]!.period}{bookings.length > 1 ? ` × ${bookings.length}` : ''}</span></div>
        <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">Total amount</span><span className="font-medium">{formatINR(totalAmount)}</span></div>
        <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{bookings[0]!.status}</span></div>
        <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">Payment</span><span className="font-medium">{allPaid ? 'Paid' : 'Unpaid'}</span></div>
      </Card>

      {!allPaid && (
        <div className="mt-4 flex flex-col items-center gap-1">
          <div className="flex justify-center">
            {isGroupBooking
              ? <PayButton groupId={id} />
              : <PayButton bookingId={bookings[0]!.id} />}
          </div>
          {isGroupBooking && <p className="text-xs text-muted-foreground">Pays the remaining {formatINR(unpaidAmount)} for all unpaid hours in one go.</p>}
        </div>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <Link href="/centres" className="rounded-md border px-4 py-2 text-sm font-semibold">Browse more</Link>
        <Link href={`/centres/${slug}`} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Back to centre</Link>
      </div>
    </main>
  );
}
