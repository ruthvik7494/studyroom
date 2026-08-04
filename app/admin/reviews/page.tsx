import { createClient } from '@/lib/supabase/server';
import { getOpenReports } from '@/features/admin/services/admin.service';
import { ReviewModerationActions } from '@/features/admin/components/review-moderation-actions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshButton } from '@/components/refresh-button';

export default async function AdminReviewsPage() {
  const db = await createClient();
  const reports = await getOpenReports(db);

  return (
    <section aria-labelledby="moderation-heading">
      <div className="mb-4 flex items-center gap-2">
        <h2 id="moderation-heading" className="font-display text-lg font-bold">Reported reviews</h2>
        <RefreshButton label="Refresh reported reviews" />
      </div>

      {reports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-3xl" aria-hidden>🧹</span>
          <p className="mt-2 font-display font-semibold">Nothing to moderate</p>
          <p className="text-sm text-muted-foreground">There are no open review reports.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.reportId} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="warning">Reported</Badge>
                    <span className="text-xs text-muted-foreground">{r.reason}</span>
                  </div>
                  {r.review ? (
                    <>
                      <p className="text-sm font-semibold">{'★'.repeat(r.review.rating)}<span className="text-muted-foreground">{'☆'.repeat(5 - r.review.rating)}</span></p>
                      <p className="mt-0.5 text-sm text-foreground/80">{r.review.body ?? <span className="italic text-muted-foreground">No text</span>}</p>
                    </>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Review was deleted.</p>
                  )}
                </div>
                {r.review && <ReviewModerationActions reviewId={r.review.id} reportId={r.reportId} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
