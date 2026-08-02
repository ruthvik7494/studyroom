import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/** Skeleton grid — shown while the feed loads (matches card layout to avoid CLS). */
export function CentreGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-32 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-14" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CentreEmptyState() {
  return (
    <EmptyState
      icon="🔍"
      title="No study spaces match"
      description="Try widening your budget or clearing a filter — new centres are added every week."
    />
  );
}

export function CentreErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        icon="⚠️"
        title="Couldn’t load study spaces"
        description="Something went wrong on our side. Please try again."
        className="border-destructive/30 bg-destructive/5"
        action={onRetry && <Button variant="outline" onClick={onRetry}>Retry</Button>}
      />
    </div>
  );
}
