import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getWaitlists, getCentreOptions } from '@/features/admin/services/waitlist.service';
import { WaitlistControls } from '@/features/admin/components/waitlist-controls';
import { RefreshButton } from '@/components/refresh-button';

export const metadata: Metadata = { title: 'Waitlist · Admin', ...noindex };

export default async function AdminWaitlistPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; centreId?: string; status?: string }> }) {
  await requireRole('admin');
  const sp = await searchParams;
  const db = await createClient();
  const [groups, centres] = await Promise.all([
    getWaitlists(db, { q: sp.q, centreId: sp.centreId, status: sp.status }),
    getCentreOptions(db),
  ]);

  const totalWaiting = groups.reduce((s, g) => s + g.waiting.length, 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl font-bold">Waitlist management</h1>
        <RefreshButton label="Refresh waitlist" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{totalWaiting} students waiting across {groups.length} resources.</p>

      <form className="mt-5 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search student or centre…" aria-label="Search waitlist"
          className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <select name="centreId" defaultValue={sp.centreId ?? ''} aria-label="Filter by centre"
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All centres</option>
          {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? 'waiting'} aria-label="Filter by status"
          className="rounded-md border bg-background px-3 py-2 text-sm">
          {['waiting', 'promoted', 'expired', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Apply</button>
      </form>

      {groups.length === 0 && (
        <Card className="mt-6 p-10 text-center text-muted-foreground">No waitlist entries match these filters.</Card>
      )}

      <div className="mt-6 space-y-4">
        {groups.map((g) => (
          <Card key={g.resourceId} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="font-display text-sm font-bold">{g.centreName} · {g.resourceLabel}</h2>
                <p className="text-xs text-muted-foreground">{g.waiting.length} waiting</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={g.seatsFree > 0 ? 'success' : 'warning'}>
                  {g.seatsFree > 0 ? `${g.seatsFree} seat${g.seatsFree > 1 ? 's' : ''} free` : 'Full'}
                </Badge>
                <span className="text-xs text-muted-foreground">{g.activeBookings}/{g.unitCount} booked</span>
              </div>
            </div>
            <WaitlistControls resourceId={g.resourceId} canPromote={g.seatsFree > 0} entries={g.waiting} />
          </Card>
        ))}
      </div>
    </div>
  );
}
