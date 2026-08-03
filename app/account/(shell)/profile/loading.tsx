import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-5 h-64 w-full" />
    </main>
  );
}
