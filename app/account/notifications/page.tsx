import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { MarkAllRead } from '@/features/notifications/components/mark-all-read';

export const metadata: Metadata = { title: 'Notifications', ...noindex };

const ICON: Record<string, string> = {
  booking_created: '📝', booking_confirmed: '✅', booking_cancelled: '✖️',
  booking_refunded: '💸', booking_rescheduled: '🔁', booking_completed: '🎓',
  booking_no_show: '⚠️', waitlist_promoted: '🎉', centre_approved: '🏢', centre_rejected: '🚫',
};

export default async function NotificationsPage() {
  await requireUser(); // auth guard — redirects if not signed in
  const db = await createClient();

  // RLS ("notif self") scopes this to the current user automatically.
  const { data: notifications } = await db
    .from('notifications')
    .select('id, kind, title, body, url, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : 'You’re all caught up.'}
          </p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </div>

      <div className="mt-6 space-y-2">
        {!notifications || notifications.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </Card>
        ) : (
          notifications.map((n) => {
            const inner = (
              <Card className={`flex gap-3 p-4 ${!n.read_at ? 'border-primary/30 bg-primary/5' : ''}`}>
                <span aria-hidden className="text-xl">{ICON[n.kind] ?? '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-semibold">{n.title}</p>
                    {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="unread" />}
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-foreground/80">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </Card>
            );
            return n.url ? (
              <Link key={n.id} href={n.url as never} className="block">{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })
        )}
      </div>
    </main>
  );
}
