import { createClient } from '@/lib/supabase/server';
import { getPendingClaims } from '@/features/admin/services/admin.service';
import { ClaimModerationActions } from '@/features/admin/components/claim-moderation-actions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshButton } from '@/components/refresh-button';

export default async function AdminClaimsPage() {
  const db = await createClient();
  const claims = await getPendingClaims(db);

  return (
    <section aria-labelledby="claims-heading">
      <div className="mb-4 flex items-center gap-2">
        <h2 id="claims-heading" className="font-display text-lg font-bold">Ownership claims</h2>
        <RefreshButton label="Refresh claims" />
      </div>

      {claims.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-3xl" aria-hidden>📋</span>
          <p className="mt-2 font-display font-semibold">No pending claims</p>
          <p className="text-sm text-muted-foreground">Ownership claims will appear here for review.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-semibold">{c.centre?.name ?? 'Unknown centre'}</p>
                    {c.centre?.owner_id
                      ? <Badge variant="warning">Already owned</Badge>
                      : <Badge variant="secondary">Unowned</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Claimant: {c.claimant?.full_name ?? '—'} · {new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                  {c.evidence && <p className="mt-2 text-sm text-foreground/80">{c.evidence}</p>}
                </div>
                <ClaimModerationActions claimId={c.id} alreadyOwned={!!c.centre?.owner_id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
