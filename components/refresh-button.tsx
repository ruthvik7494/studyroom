'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/**
 * Small icon button that re-fetches the current page's server-rendered
 * data (via router.refresh()) without a full browser reload — used next to
 * table/list headings across the Admin and Owner dashboards. router.refresh()
 * re-runs the page's Server Component data fetch in place, keeping scroll
 * position and any open client-side state (filters, expanded rows, etc.)
 * intact, which a hard reload would lose.
 */
export function RefreshButton({ label = 'Refresh' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} aria-hidden />
    </button>
  );
}
