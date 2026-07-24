import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="max-w-xl space-y-3">
      <Skeleton className="h-6 w-56" />
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
    </div>
  );
}
