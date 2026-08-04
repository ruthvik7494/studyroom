import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { formatINR } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/booking-status-badge';
import { getBookingMetrics, searchBookings, BOOKING_STATUSES, type BookingStatus } from '@/features/admin/services/bookings.service';
import { BookingFilters } from '@/features/admin/components/booking-filters';
import { RefreshButton } from '@/components/refresh-button';

export const metadata: Metadata = { title: 'Bookings · Admin', ...noindex };

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="font-display text-2xl font-extrabold text-brand-green">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  await requireRole('admin');
  const sp = await searchParams;
  const db = await createClient();

  const status = (BOOKING_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as BookingStatus)
    : undefined;
  const sort = (sp.sort ?? 'created') as 'created' | 'starts' | 'payment';

  const [metrics, { rows, total }] = await Promise.all([
    getBookingMetrics(db),
    searchBookings(db, { q: sp.q, status, sort, limit: 50 }),
  ]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Booking management</h1>
        <RefreshButton label="Refresh bookings" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Search, filter, and manage every booking.</p>

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Today" value={metrics.today} />
        <Metric label="This week" value={metrics.week} />
        <Metric label="This month" value={metrics.month} />
        <Metric label="Revenue (mo)" value={formatINR(metrics.revenue)} />
        <Metric label="Refunds (mo)" value={formatINR(metrics.refunds)} />
        <Metric label="No-shows" value={metrics.noShows} />
        <Metric label="Waitlist" value={metrics.waitlist} />
        <Metric label="Total shown" value={total} />
      </div>

      {/* Filters + export */}
      <div className="mt-6">
        <BookingFilters q={sp.q} status={status} sort={sort} />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5">Centre</th>
              <th scope="col" className="px-3 py-2.5">Student</th>
              <th scope="col" className="px-3 py-2.5">Period</th>
              <th scope="col" className="px-3 py-2.5">Start</th>
              <th scope="col" className="px-3 py-2.5">Amount</th>
              <th scope="col" className="px-3 py-2.5">Status</th>
              <th scope="col" className="px-3 py-2.5">Payment</th>
              <th scope="col" className="px-3 py-2.5">Booked</th>
              <th scope="col" className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No bookings match these filters.</td></tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2.5 font-semibold">{b.centre?.name ?? '—'}</td>
                <td className="px-3 py-2.5">{b.student?.full_name ?? 'Guest'}</td>
                <td className="px-3 py-2.5 capitalize">{b.period}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {new Date(b.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td className="px-3 py-2.5">{formatINR(Number(b.amount))}</td>
                <td className="px-3 py-2.5"><BookingStatusBadge status={b.status} /></td>
                <td className="px-3 py-2.5"><PaymentStatusBadge status={b.payment} /></td>
                <td className="px-3 py-2.5 text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={`/admin/bookings/${b.id}`} className="font-semibold text-brand-green hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
