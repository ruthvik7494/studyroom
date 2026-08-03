import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { formatINR } from '@/lib/utils';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/booking-status-badge';
import { getOwnerBookings } from '@/features/owner/services/bookings.service';
import { OwnerBookingRowActions } from '@/features/owner/components/owner-booking-row-actions';

export const metadata: Metadata = { title: 'Bookings · Owner', ...noindex };

const STATUSES = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'expired', 'refunded'];

export default async function OwnerBookingsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; status?: string; scope?: string }> }) {
  const user = await requireRole('owner');
  const sp = await searchParams;
  const db = await createClient();

  const scope = (sp.scope as 'today' | 'upcoming' | 'all') ?? 'all';
  let rows = await getOwnerBookings(db, user.id, scope, 200);
  if (sp.status) rows = rows.filter((r) => r.status === sp.status);
  if (sp.q) {
    const n = sp.q.toLowerCase();
    rows = rows.filter((r) => r.centre?.name?.toLowerCase().includes(n) || r.student?.full_name?.toLowerCase().includes(n));
  }

  // Customer list (unique students in view).
  const customers = new Map<string, string>();
  for (const r of rows) if (r.student?.full_name) customers.set(r.student.full_name, r.student.full_name);

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-xl font-bold">Bookings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Search, filter, manage and export your bookings.</p>

      <form className="mt-5 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search student or centre…" aria-label="Search"
          className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <select name="scope" defaultValue={scope} aria-label="Scope" className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">All time</option><option value="today">Today</option><option value="upcoming">Upcoming</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Apply</button>
        <a href={`/api/owner/bookings/export?scope=${scope}`} className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-secondary">Export CSV</a>
        <a href={`/api/owner/bookings/export?scope=${scope}&format=xlsx`} className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-secondary">Export Excel</a>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">{rows.length} bookings · {customers.size} customers</p>

      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th scope="col" className="px-3 py-2.5">Student</th><th scope="col" className="px-3 py-2.5">Centre</th><th scope="col" className="px-3 py-2.5">Period</th><th scope="col" className="px-3 py-2.5">Start</th>
              <th scope="col" className="px-3 py-2.5">Amount</th><th scope="col" className="px-3 py-2.5">Status</th><th scope="col" className="px-3 py-2.5">Payment</th><th scope="col" className="px-3 py-2.5">Manage</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No bookings match.</td></tr>}
            {rows.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-3 py-2.5">{b.student?.full_name ?? 'Guest'}</td>
                <td className="px-3 py-2.5 font-semibold">{b.centre?.name ?? '—'}</td>
                <td className="px-3 py-2.5 capitalize">{b.period}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {new Date(b.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td className="px-3 py-2.5">{formatINR(Number(b.amount))}</td>
                <td className="px-3 py-2.5"><BookingStatusBadge status={b.status} /></td>
                <td className="px-3 py-2.5"><PaymentStatusBadge status={b.payment} /></td>
                <td className="px-3 py-2.5"><OwnerBookingRowActions bookingId={b.id} status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
