import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAdminStats, getAdminOverview, getRevenueTrend, getRecentActivity } from '@/features/admin/services/admin.service';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import { DonutChart, DonutLegend } from '@/components/ui/donut-chart';
import { Sparkline } from '@/components/ui/sparkline';

const CARDS = [
  { key: 'pendingCentres', label: 'Listings awaiting approval', href: '/admin/centres/all?tab=pending', bg: 'bg-violet-100', fg: 'text-violet-600', icon: '📋' },
  { key: 'openReports', label: 'Open review reports', href: '/admin/reviews', bg: 'bg-amber-100', fg: 'text-amber-600', icon: '📝' },
  { key: 'pendingClaims', label: 'Pending claims', href: '/admin/claims', bg: 'bg-rose-100', fg: 'text-rose-600', icon: '🛡️' },
  { key: 'newEnquiries', label: 'New enquiries', href: '/admin/enquiries', bg: 'bg-emerald-100', fg: 'text-emerald-600', icon: '✉️' },
] as const;

const ACTIVITY_LABEL: Record<string, string> = {
  'booking.cancelled': 'Booking cancelled',
  'booking.checked_in': 'Booking checked in',
  'centre.submitted_for_review': 'Centre submitted for review',
  'centre.archived': 'Centre archived',
  'centre.pricing_updated': 'Pricing updated',
  'refund.reviewed': 'Refund reviewed',
  'refund.completed': 'Refund completed',
  'auth.register': 'New user registered',
  'auth.password_changed': 'Password changed',
  'user.account_status_changed': 'Account status changed',
  'review.responded': 'Owner responded to a review',
};

const QUICK_ACTIONS = [
  { href: '/admin/centres/new', label: 'Create New Centre', icon: '➕' },
  { href: '/admin/users', label: 'Manage Users', icon: '👥' },
  { href: '/admin/bookings', label: 'View All Bookings', icon: '📅' },
  { href: '/admin/claims', label: 'Open Claims', icon: '🛡️' },
  { href: '/admin/enquiries', label: 'View Enquiries', icon: '✉️' },
  { href: '/admin/audit', label: 'View Audit Log', icon: '📄' },
] as const;

export default async function AdminOverviewPage() {
  const db = await createClient();
  const [stats, overview, revenueTrend, activity] = await Promise.all([
    getAdminStats(db), getAdminOverview(db), getRevenueTrend(db, 14), getRecentActivity(db, 6),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, Admin! Here&apos;s what&apos;s happening on StudyNook.</p>
      </div>

      {/* Pending actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link key={c.key} href={c.href as never}>
            <Card className="flex items-start gap-3 p-5 transition hover:shadow-md">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${c.bg} ${c.fg}`} aria-hidden>{c.icon}</span>
              <div>
                <p className="font-display text-2xl font-extrabold">{stats[c.key]}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <span className="mt-1 inline-block text-xs font-semibold text-primary">View all →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Platform overview */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Platform Overview</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600" aria-hidden>👥</span>
              {overview.users.newLast30d > 0 && <span className="text-xs font-semibold text-emerald-600">+{overview.users.newLast30d} (30d)</span>}
            </div>
            <p className="mt-3 text-sm font-semibold text-muted-foreground">Users</p>
            <p className="font-display text-3xl font-extrabold">{overview.users.total}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
              <div><p className="font-bold">{overview.users.students}</p><p className="text-muted-foreground">Students</p></div>
              <div><p className="font-bold">{overview.users.owners}</p><p className="text-muted-foreground">Owners</p></div>
              <div><p className="font-bold">{overview.users.admins}</p><p className="text-muted-foreground">Admins</p></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600" aria-hidden>🏢</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-muted-foreground">Study Centres</p>
            <p className="font-display text-3xl font-extrabold">{overview.centres.total}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-center text-xs">
              <div><p className="font-bold">{overview.centres.published}</p><p className="text-muted-foreground">Published</p></div>
              <div><p className="font-bold">{overview.centres.approved}</p><p className="text-muted-foreground">Approved</p></div>
              <div><p className="font-bold">{overview.centres.rejected}</p><p className="text-muted-foreground">Rejected</p></div>
              <div><p className="font-bold">{overview.centres.archived}</p><p className="text-muted-foreground">Archived</p></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600" aria-hidden>💰</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-muted-foreground">Revenue</p>
            <p className="font-display text-3xl font-extrabold">{formatINR(overview.revenue.totalLifetime)}</p>
            <Sparkline points={revenueTrend} color="#059669" />
            <div className="mt-1 flex justify-between border-t pt-2 text-xs text-muted-foreground">
              <span>7d: {formatINR(overview.revenue.last7d)}</span>
              <span>30d: {formatINR(overview.revenue.last30d)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Donuts + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="mb-4 font-display font-bold">Booking Lifecycle</p>
          <div className="flex items-center gap-5">
            <DonutChart segments={[
              { label: 'Pending', value: overview.bookings.pending, color: '#6366f1' },
              { label: 'Confirmed', value: overview.bookings.confirmed, color: '#3b82f6' },
              { label: 'Checked In', value: overview.bookings.checkedIn, color: '#10b981' },
              { label: 'Completed', value: overview.bookings.completed, color: '#059669' },
              { label: 'Cancelled', value: overview.bookings.cancelled, color: '#f43f5e' },
              { label: 'Expired', value: overview.bookings.expired, color: '#a855f7' },
            ]} />
            <DonutLegend segments={[
              { label: 'Pending', value: overview.bookings.pending, color: '#6366f1' },
              { label: 'Confirmed', value: overview.bookings.confirmed, color: '#3b82f6' },
              { label: 'Checked In', value: overview.bookings.checkedIn, color: '#10b981' },
              { label: 'Completed', value: overview.bookings.completed, color: '#059669' },
              { label: 'Cancelled', value: overview.bookings.cancelled, color: '#f43f5e' },
              { label: 'Expired', value: overview.bookings.expired, color: '#a855f7' },
            ]} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-4 font-display font-bold">Payments</p>
          <div className="flex items-center gap-5">
            <DonutChart segments={[
              { label: 'Paid', value: overview.payments.paid, color: '#6366f1' },
              { label: 'Unpaid', value: overview.payments.unpaid, color: '#f97316' },
              { label: 'Failed', value: overview.payments.failed, color: '#f43f5e' },
              { label: 'Refund Pending', value: overview.payments.refundPending, color: '#eab308' },
              { label: 'Refunded', value: overview.payments.refunded, color: '#a855f7' },
            ]} />
            <DonutLegend segments={[
              { label: 'Paid', value: overview.payments.paid, color: '#6366f1' },
              { label: 'Unpaid', value: overview.payments.unpaid, color: '#f97316' },
              { label: 'Failed', value: overview.payments.failed, color: '#f43f5e' },
              { label: 'Refund Pending', value: overview.payments.refundPending, color: '#eab308' },
              { label: 'Refunded', value: overview.payments.refunded, color: '#a855f7' },
            ]} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 flex items-center gap-1.5 font-display font-bold"><span aria-hidden>⚡</span> Quick Actions</p>
          <div className="space-y-1">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href as never} className="flex items-center justify-between rounded-lg px-2 py-2.5 text-sm hover:bg-secondary">
                <span className="flex items-center gap-2.5"><span aria-hidden>{a.icon}</span>{a.label}</span>
                <span aria-hidden className="text-muted-foreground">›</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-display font-bold"><span aria-hidden>🕐</span> Recent Activity</p>
          <Link href="/admin/audit" className="text-xs font-semibold text-primary hover:underline">View all activity</Link>
        </div>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activity.map((a) => (
              <div key={a.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                <p className="font-medium">{ACTIVITY_LABEL[a.action] ?? a.action}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
