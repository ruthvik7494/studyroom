import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { formatINR } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/booking-status-badge';
import { getOwnerMetrics, getOwnerBookings } from '@/features/owner/services/bookings.service';

export const metadata: Metadata = { title: 'Dashboard · Owner', ...noindex };

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="font-display text-2xl font-extrabold text-brand-green">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </Card>
  );
}

function BookingList({ title, rows, empty }: { title: string; rows: Awaited<ReturnType<typeof getOwnerBookings>>; empty: string }) {
  return (
    <Card className="p-4">
      <h2 className="font-display text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="text-sm font-semibold">{b.centre?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {b.student?.full_name ?? 'Guest'} · {b.period} · {new Date(b.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{formatINR(Number(b.amount))}</span>
                <BookingStatusBadge status={b.status} />
                <PaymentStatusBadge status={b.payment} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function OwnerDashboardPage() {
  const user = await requireRole('owner');
  const db = await createClient();

  const [metrics, todayRows, upcomingRows, { data: centreIdsRows }, { data: rejectedCentres }] = await Promise.all([
    getOwnerMetrics(db, user.id),
    getOwnerBookings(db, user.id, 'today', 20),
    getOwnerBookings(db, user.id, 'upcoming', 20),
    db.from('centres').select('id').eq('owner_id', user.id),
    db.from('centres').select('id, name').eq('owner_id', user.id).eq('status', 'rejected'),
  ]);
  const ownedCentreIds = new Set((centreIdsRows ?? []).map((c) => c.id));
  let pendingRefunds = 0;
  if (ownedCentreIds.size > 0) {
    const { data: refundRows } = await db.from('refunds')
      .select('id, bookings(centre_id)')
      .eq('status', 'pending')
      .limit(500);
    pendingRefunds = (refundRows ?? []).filter((r) => {
      const booking = r.bookings as unknown as { centre_id: string } | null;
      return booking && ownedCentreIds.has(booking.centre_id);
    }).length;
  }

  const alerts: { text: string; href: string }[] = [];
  if (pendingRefunds > 0) alerts.push({ text: `${pendingRefunds} refund request${pendingRefunds === 1 ? '' : 's'} awaiting your review`, href: '/owner/refunds' });
  if (rejectedCentres && rejectedCentres.length > 0) alerts.push({ text: `${rejectedCentres.length} listing${rejectedCentres.length === 1 ? '' : 's'} rejected — needs your attention`, href: '/owner/centres' });
  if (metrics.waitlist > 0) alerts.push({ text: `${metrics.waitlist} student${metrics.waitlist === 1 ? '' : 's'} on your waitlist`, href: '/owner/bookings' });

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bookings, occupancy and revenue across your centres.</p>

      {/* Pending actions / alerts — only shown when there's something real to act on */}
      {alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {alerts.map((a) => (
            <Link key={a.href + a.text} href={a.href as never} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 hover:bg-amber-100">
              <span>⚠️ {a.text}</span>
              <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      )}

      {/* Quick shortcuts */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/owner/centres/new" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">+ New listing</Link>
        <Link href="/owner/bookings" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">View bookings</Link>
        <Link href="/owner/calendar" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">Calendar</Link>
        <Link href="/owner/refunds" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">Refunds</Link>
        <Link href="/owner/centres" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">My listings</Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Today's bookings" value={metrics.today} />
        <Metric label="Upcoming" value={metrics.upcoming} />
        <Metric label="Occupancy now" value={`${metrics.occupancyPct}%`} />
        <Metric label="Revenue (mo)" value={formatINR(metrics.revenue)} />
        <Metric label="Checked in" value={metrics.checkIns} />
        <Metric label="No-shows" value={metrics.noShows} />
        <Metric label="Waitlist" value={metrics.waitlist} />
        <Metric label="Export" value="CSV" hint="via Bookings tab" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BookingList title="Today" rows={todayRows} empty="No bookings scheduled for today." />
        <BookingList title="Upcoming" rows={upcomingRows} empty="No upcoming bookings." />
      </div>
    </main>
  );
}
