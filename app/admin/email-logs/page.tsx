import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEmailLogs } from '@/features/admin/services/admin.service';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshButton } from '@/components/refresh-button';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Email Logs · Admin', ...noindex };

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning'> = {
  sent: 'success', failed: 'destructive', queued: 'warning',
};

interface PageProps { searchParams: Promise<{ status?: string; q?: string }> }

export default async function AdminEmailLogsPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const db = await createClient();
  const logs = await getEmailLogs(db, { status, q });

  const tabHref = (t?: string) => {
    const params = new URLSearchParams();
    if (t) params.set('status', t);
    if (q) params.set('q', q);
    const qs = params.toString();
    return `/admin/email-logs${qs ? `?${qs}` : ''}`;
  };

  return (
    <section aria-labelledby="email-logs-heading">
      <div className="mb-1 flex items-center gap-2">
        <h2 id="email-logs-heading" className="font-display text-lg font-bold">Email Logs</h2>
        <RefreshButton label="Refresh email logs" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Every transactional email attempt — signup confirmations, booking updates, refund notices and more —
        is recorded here, whether it actually sent, failed, or was queued (no email provider configured).
        Logs older than 60 days are automatically deleted daily.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {[undefined, 'sent', 'failed', 'queued'].map((t) => (
            <Link
              key={t ?? 'all'}
              href={tabHref(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${(status ?? undefined) === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              {t ?? 'All'}
            </Link>
          ))}
        </div>
        <form action="/admin/email-logs" method="get" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search recipient email"
            aria-label="Search recipient email"
            className="h-9 w-56 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground"
          />
          <button type="submit" className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">Search</button>
        </form>
      </div>

      {logs.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted-foreground">No email logs match that filter.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{l.to_email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.template}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[l.status] ?? 'secondary'} className="capitalize">{l.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-destructive" title={l.error ?? undefined}>{l.error ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(l.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
