import type { Metadata } from 'next';
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

  const [metrics, todayRows, upcomingRows] = await Promise.all([
    getOwnerMetrics(db, user.id),
    getOwnerBookings(db, user.id, 'today', 20),
    getOwnerBookings(db, user.id, 'upcoming', 20),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bookings, occupancy and revenue across your centres.</p>

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
