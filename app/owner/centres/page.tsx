import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitForReviewButton } from '@/features/centres/components/submit-for-review-button';
import { ArchiveButton, UnarchiveButton, PublishToggle } from '@/features/centres/components/centre-lifecycle-buttons';
import { RefreshButton } from '@/components/refresh-button';

export const metadata: Metadata = { title: 'My listings', ...noindex };

const STATUS_VARIANT: Record<string, 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary', pending_review: 'warning', approved: 'success',
  rejected: 'warning', suspended: 'warning', archived: 'secondary',
};

export default async function OwnerCentresPage() {
  const user = await requireRole('owner');
  const db = await createClient();
  const { data: centres } = await db
    .from('centres')
    .select('id, name, slug, area, emoji, status, rejection_reason, is_published')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const list = centres ?? [];

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">My listings</h1>
          <RefreshButton label="Refresh listings" />
        </div>
        <Link href="/owner/centres/new" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">+ New listing</Link>
      </div>

      {list.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="font-display font-semibold">No listings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first study space to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-4 p-4">
              <span className="text-2xl" aria-hidden>{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.area}</p>
                {c.status === 'rejected' && c.rejection_reason && (
                  <p className="mt-1 text-xs text-destructive">Rejected: {c.rejection_reason}</p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[c.status] ?? 'secondary'}>{c.status.replace('_', ' ')}</Badge>
              {c.status === 'approved' && <PublishToggle centreId={c.id} published={c.is_published} />}
              {(c.status === 'draft' || c.status === 'rejected') && <SubmitForReviewButton centreId={c.id} />}
              <Link href={`/owner/centres/${c.id}`} className="text-sm font-semibold underline">Edit</Link>
              {c.status === 'archived' ? <UnarchiveButton centreId={c.id} /> : <ArchiveButton centreId={c.id} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
