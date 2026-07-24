import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { searchCentresPaginated } from '@/features/centres/services/centres.service';
import { centrePaginatedSearchSchema } from '@/features/centres/schema';
import { CentreCard } from '@/features/centres/components/centre-card';
import { CentreListRow } from '@/features/centres/components/centre-list-row';
import { CentreEmptyState } from '@/features/centres/components/centre-states';
import { CentreSearchBar } from '@/features/centres/components/centre-search-bar';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Study spaces in Warangal',
  description: 'Browse verified study halls, reading rooms and coworking seats with live availability, ratings and prices.',
  alternates: { canonical: '/centres' },
};

const PAGE_SIZE = 8;

// Every render depends on searchParams (search/sort/view/page), and a client-side
// Link navigation to a bare /centres was observed serving a stale cached shell
// until a manual refresh. Forcing fully dynamic rendering rules that out.
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Discovery page: numbered pagination (8/page), name/address search, price
 * range, price sort, grid/list toggle. Fully server-rendered — every control
 * is a plain link or GET form, so any page/view/sort/search state is a normal
 * shareable URL.
 */
export default async function CentresPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = centrePaginatedSearchSchema.parse(raw);

  const db = await createClient();
  const result = await searchCentresPaginated(db, { ...filters, pageSize: PAGE_SIZE });

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    params.set('sort', filters.sort);
    params.set('view', filters.view);
    params.set('page', String(page));
    return `/centres?${params.toString()}`;
  };
  const hrefForView = (view: 'grid' | 'list') => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    params.set('sort', filters.sort);
    params.set('view', view);
    return `/centres?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Study spaces' }]} />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Study spaces in Warangal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live availability, verified reviews, transparent prices.</p>
        </div>
        <div className="flex overflow-hidden rounded-md border" role="group" aria-label="View">
          <Link href={hrefForView('grid')} className={cn('px-3 py-1.5 text-sm font-semibold', filters.view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
            Grid
          </Link>
          <Link href={hrefForView('list')} className={cn('px-3 py-1.5 text-sm font-semibold', filters.view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
            List
          </Link>
        </div>
      </header>

      <CentreSearchBar filters={filters} />

      <p className="mb-3 text-sm text-muted-foreground">{result.total} centre{result.total === 1 ? '' : 's'} found</p>

      {result.items.length === 0 ? (
        <CentreEmptyState />
      ) : filters.view === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {result.items.map((c) => <CentreCard key={c.id} centre={c} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result.items.map((c) => <CentreListRow key={c.id} centre={c} />)}
        </div>
      )}

      <PaginationBar page={result.page} totalPages={result.totalPages} hrefForPage={hrefForPage} />
    </main>
  );
}
