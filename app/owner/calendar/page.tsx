import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { getOwnerCalendar } from '@/features/owner/services/bookings.service';

export const metadata: Metadata = { title: 'Calendar', ...noindex };

/**
 * Month calendar of bookings across the owner's centres. Server-rendered grid;
 * ?m=YYYY-MM selects the month (defaults to current). Each day cell shows a
 * count and the first couple of bookings.
 */
export default async function OwnerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireRole('owner');
  const db = await createClient();

  const { m } = await searchParams;
  const now = new Date();
  const ym = m && /^\d{4}-\d{2}$/.test(m) ? m : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yr = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7));

  const first = new Date(Date.UTC(yr, mo - 1, 1));
  const last = new Date(Date.UTC(yr, mo, 0)); // last day of month
  const fromISO = first.toISOString();
  const toISO = new Date(Date.UTC(yr, mo - 1, last.getUTCDate(), 23, 59, 59)).toISOString();

  const bookings = await getOwnerCalendar(db, user.id, fromISO, toISO);

  // Group by day-of-month.
  const byDay = new Map<number, typeof bookings>();
  for (const b of bookings) {
    const d = Number(b.date.slice(8, 10));
    const list = byDay.get(d) ?? [];
    list.push(b);
    byDay.set(d, list);
  }

  const daysInMonth = last.getUTCDate();
  const startWeekday = first.getUTCDay(); // 0=Sun
  const monthName = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Prev/next month links.
  const prev = new Date(Date.UTC(yr, mo - 2, 1));
  const next = new Date(Date.UTC(yr, mo, 1));
  const fmtM = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  // Build the grid cells (leading blanks + days).
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bookings across your centres, by day.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a href={`/owner/calendar?m=${fmtM(prev)}`} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">← Prev</a>
          <span className="font-display font-semibold">{monthName}</span>
          <a href={`/owner/calendar?m=${fmtM(next)}`} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Next →</a>
        </div>
      </div>

      <Card className="mt-6 overflow-x-auto p-3">
        <div className="min-w-[560px]">
        <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (cell.day === null) return <div key={`b${i}`} className="min-h-20 rounded-lg" />;
            const dayBookings = byDay.get(cell.day) ?? [];
            return (
              <div key={cell.day} className="min-h-20 rounded-lg border border-border p-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{cell.day}</span>
                  {dayBookings.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{dayBookings.length}</span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayBookings.slice(0, 2).map((b) => (
                    <div key={b.id} className="truncate rounded bg-muted px-1 py-0.5 text-[10px]" title={`${b.centreName} · ${b.status}`}>
                      {b.centreName}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </Card>
    </div>
  );
}
