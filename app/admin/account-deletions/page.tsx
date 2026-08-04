import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPendingDeletionRequests } from '@/features/admin/services/admin.service';
import { DeletionRequestActions } from '@/features/admin/components/deletion-request-actions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { noindex } from '@/lib/seo';
import { RefreshButton } from '@/components/refresh-button';

export const metadata: Metadata = { title: 'Account Deletions · Admin', ...noindex };

export default async function AdminAccountDeletionsPage() {
  const db = await createClient();
  const requests = await getPendingDeletionRequests(db);

  return (
    <section aria-labelledby="deletions-heading">
      <div className="mb-1 flex items-center gap-2">
        <h2 id="deletions-heading" className="font-display text-lg font-bold">Account Deletions</h2>
        <RefreshButton label="Refresh account deletions" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Requested by students and owners from their own dashboard. Approving is permanent — it disables the
        login and removes personal info. Booking, payment and review records are kept, not deleted.
      </p>

      {requests.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-3xl" aria-hidden>🗑️</span>
          <p className="mt-2 font-display font-semibold">No pending requests</p>
          <p className="text-sm text-muted-foreground">Account deletion requests will appear here for review.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-semibold">{r.user?.full_name ?? 'Unknown user'}</p>
                    {r.user?.role && <Badge variant="secondary" className="capitalize">{r.user.role}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Requested {new Date(r.requested_at).toLocaleDateString('en-IN')}
                  </p>
                  {r.reason && <p className="mt-2 text-sm text-foreground/80">&ldquo;{r.reason}&rdquo;</p>}
                </div>
                <DeletionRequestActions requestId={r.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
