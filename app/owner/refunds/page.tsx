import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/utils';
import { RefundActions } from '@/features/refunds/components/refund-actions';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Refund requests', ...noindex };

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning', approved: 'secondary', completed: 'success', rejected: 'destructive',
};

export default async function OwnerRefundsPage() {
  const user = await requireRole('owner');
  const db = await createClient();

  const { data: centres } = await db.from('centres').select('id').eq('owner_id', user.id);
  const centreIds = (centres ?? []).map((c) => c.id);

  // PostgREST doesn't support filtering by a nested/joined table's column
  // directly with .in() the way it does for top-level columns — fetch
  // broadly (capped), then filter down to this owner's own centres in JS,
  // matching the pattern already used for similar owner-scoped queries
  // elsewhere in this app.
  const { data: allRefunds } = await db.from('refunds')
    .select('id, amount, reason, status, is_partial, created_at, processed_at, booking_id, bookings(id, starts_at, centre_id, centres(name), student:user_id(full_name))')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (allRefunds ?? []).filter((r) => {
    const booking = r.bookings as unknown as { centre_id: string } | null;
    return booking && centreIds.includes(booking.centre_id);
  });

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl font-bold">Refund requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Review and process refund requests for your centres.</p>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && (
          <Card className="py-12 text-center text-sm text-muted-foreground">No refund requests yet.</Card>
        )}
        {rows.map((r) => {
          const booking = r.bookings as unknown as { starts_at: string; centres: { name: string } | null; student: { full_name: string | null } | null } | null;
          return (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{booking?.centres?.name ?? 'Centre'} — {formatINR(Number(r.amount))}{r.is_partial ? ' (partial)' : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {booking?.student?.full_name ?? 'Student'} · Booked for {booking ? new Date(booking.starts_at).toLocaleDateString('en-IN') : '—'}
                </p>
                {r.reason && <p className="mt-1 text-xs text-muted-foreground">Reason: {r.reason}</p>}
                <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'} className="mt-1.5 capitalize">{r.status}</Badge>
              </div>
              <RefundActions refundId={r.id} status={r.status} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
