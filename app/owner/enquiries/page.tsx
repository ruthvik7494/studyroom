import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Enquiries', ...noindex };

export default async function OwnerEnquiriesPage() {
  const user = await requireRole('owner');
  const db = await createClient();

  // RLS also restricts to the owner's centres; the join keeps it explicit.
  const { data: enquiries } = await db
    .from('enquiries')
    .select('id, name, email, phone, message, status, created_at, centres!inner(name, owner_id)')
    .eq('centres.owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Enquiries</h1>
      <p className="mt-1 text-sm text-muted-foreground">Messages from students interested in your centres.</p>

      {!enquiries || enquiries.length === 0 ? (
        <Card className="mt-6 py-12 text-center text-sm text-muted-foreground">No enquiries yet.</Card>
      ) : (
        <div className="mt-6 space-y-3">
          {enquiries.map((e) => {
            const c = e.centres as unknown as { name: string } | null;
            return (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold">{e.name}</p>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{e.email}{e.phone ? ` · ${e.phone}` : ''} · re: {c?.name}</p>
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
