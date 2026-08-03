import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Enquiries · Admin', ...noindex };

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'secondary'> = {
  new: 'warning', replied: 'success', closed: 'secondary',
};

export default async function AdminEnquiriesPage() {
  await requireRole('admin');
  const db = await createClient();

  const { data: enquiries } = await db
    .from('enquiries')
    .select('id, name, email, phone, message, status, created_at, centres(name, slug)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Enquiries</h1>
      <p className="mt-1 text-sm text-muted-foreground">Messages sent to study centres across the platform.</p>

      {!enquiries || enquiries.length === 0 ? (
        <Card className="mt-6 py-12 text-center text-sm text-muted-foreground">No enquiries yet.</Card>
      ) : (
        <div className="mt-6 space-y-3">
          {enquiries.map((e) => {
            const c = e.centres as unknown as { name: string; slug: string } | null;
            return (
              <Card key={e.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display font-semibold">{e.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[e.status] ?? 'secondary'} className="capitalize">{e.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{e.email}{e.phone ? ` · ${e.phone}` : ''} · re: {c?.name ?? 'Unknown centre'}</p>
                <p className="mt-2 text-sm text-foreground/80">{e.message}</p>
                <a href={`mailto:${e.email}`} className="mt-2 inline-block text-sm font-semibold text-brand-green hover:underline">Reply by email →</a>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
