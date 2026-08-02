import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAdminStats, getAdminOverview } from '@/features/admin/services/admin.service';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';

const CARDS = [
  { key: 'pendingCentres', label: 'Listings awaiting approval', href: '/admin/centres' },
  { key: 'openReports', label: 'Open review reports', href: '/admin/reviews' },
  { key: 'pendingClaims', label: 'Pending claims', href: '/admin/centres' },
  { key: 'newEnquiries', label: 'New enquiries', href: '/admin' },
] as const;

function StatGroup({ title, items }: { title: string; items: { label: string; value: string | number; href?: string }[] }) {
  return (
    <Card className="p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => {
          const body = (
            <div>
              <p className="font-display text-xl font-extrabold text-brand-green">{it.value}</p>
              <p className="text-xs text-muted-foreground">{it.label}</p>
            </div>
          );
          return it.href ? <Link key={it.label} href={it.href as never} className="hover:opacity-80">{body}</Link> : <div key={it.label}>{body}</div>;
        })}
      </div>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const db = await createClient();
  const [stats, overview] = await Promise.all([getAdminStats(db), getAdminOverview(db)]);

  return (
    <div className="space-y-6">
      {/* Pending actions — unchanged from before */}
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <Link key={c.key} href={c.href as never}>
              <Card className="p-5 transition hover:shadow-md">
                <p className="font-display text-3xl font-extrabold text-brand-green">{stats[c.key]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Comprehensive platform overview — new */}
      <section aria-labelledby="platform-heading" className="space-y-4">
        <h2 id="platform-heading" className="font-display text-lg font-bold">Platform overview</h2>

        <div className="grid gap-4 lg:grid-cols-3">
          <StatGroup title="Users" items={[
            { label: 'Total users', value: overview.users.total, href: '/admin/users' },
            { label: 'Students', value: overview.users.students, href: '/admin/users?role=student' },
            { label: 'Owners', value: overview.users.owners, href: '/admin/users?role=owner' },
            { label: 'New (30d)', value: overview.users.newLast30d },
            { label: 'Suspended', value: overview.users.suspended },
            { label: 'Admins', value: overview.users.admins, href: '/admin/users?role=admin' },
          ]} />

          <StatGroup title="Study centres" items={[
            { label: 'Total', value: overview.centres.total, href: '/admin/centres/all' },
            { label: 'Published', value: overview.centres.published },
            { label: 'Pending review', value: overview.centres.pendingReview, href: '/admin/centres' },
            { label: 'Approved', value: overview.centres.approved },
            { label: 'Rejected', value: overview.centres.rejected },
            { label: 'Archived', value: overview.centres.archived },
          ]} />

          <StatGroup title="Revenue" items={[
            { label: 'Last 7 days', value: formatINR(overview.revenue.last7d) },
            { label: 'Last 30 days', value: formatINR(overview.revenue.last30d) },
            { label: 'Gross revenue (lifetime)', value: formatINR(overview.revenue.totalLifetime) },
          ]} />

          <StatGroup title="Booking lifecycle" items={[
            { label: 'Total', value: overview.bookings.total, href: '/admin/bookings' },
            { label: 'Pending', value: overview.bookings.pending },
            { label: 'Confirmed', value: overview.bookings.confirmed },
            { label: 'Checked in', value: overview.bookings.checkedIn },
            { label: 'Completed', value: overview.bookings.completed },
            { label: 'Cancelled', value: overview.bookings.cancelled },
            { label: 'Expired', value: overview.bookings.expired },
          ]} />

          <StatGroup title="Payments" items={[
            { label: 'Paid', value: overview.payments.paid },
            { label: 'Unpaid', value: overview.payments.unpaid },
            { label: 'Failed', value: overview.payments.failed },
            { label: 'Refund pending', value: overview.payments.refundPending },
            { label: 'Refunded', value: overview.payments.refunded },
          ]} />
        </div>

        {overview.pendingRefunds > 0 && (
          <Card className="flex items-center justify-between border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span>⚠️ {overview.pendingRefunds} refund request{overview.pendingRefunds === 1 ? '' : 's'} awaiting review across the platform.</span>
          </Card>
        )}
      </section>
    </div>
  );
}
