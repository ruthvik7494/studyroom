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
import { Card } from '@/components/ui/card';
import { getSessionUser } from '@/lib/auth/rbac';
import { cn } from '@/lib/utils';
import { getServiceArea } from '@/lib/service-area';

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { area } = await searchParams;
  const areaName = typeof area === 'string' && area.trim() ? area.trim() : undefined;
  if (areaName) {
    return {
      title: `Study spaces in ${areaName}`,
      description: 'Browse verified study halls, reading rooms and coworking seats with live availability, ratings and prices.',
      alternates: { canonical: '/centres' },
    };
  }
  const db = await createClient();
  const { city } = await getServiceArea(db);
  return {
    title: city ? `Study spaces in ${city}` : 'Study spaces',
    description: 'Browse verified study halls, reading rooms and coworking seats with live availability, ratings and prices.',
    alternates: { canonical: '/centres' },
  };
}

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
 * range, study-type filter, women-safe filter, sort, grid/list toggle. Fully
 * server-rendered — every control is a plain link or GET form, so any
 * page/view/sort/search state is a normal shareable URL.
 */
export default async function CentresPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = centrePaginatedSearchSchema.parse(raw);

  const db = await createClient();
  const viewer = await getSessionUser();
  const [result, serviceArea] = await Promise.all([
    searchCentresPaginated(db, { ...filters, pageSize: PAGE_SIZE }),
    getServiceArea(db),
  ]);

  let savedIds = new Set<string>();
  if (viewer) {
    const { data: savedRows } = await db.from('saved_listings').select('centre_id').eq('user_id', viewer.id);
    savedIds = new Set((savedRows ?? []).map((r) => r.centre_id));
  }

  const baseParams = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.area) params.set('area', filters.area);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.spaceType) params.set('spaceType', filters.spaceType);
    if (filters.womenSafe) params.set('womenSafe', 'true');
    return params;
  };
  const hrefForPage = (page: number) => {
    const params = baseParams();
    params.set('sort', filters.sort);
    params.set('view', filters.view);
    params.set('page', String(page));
    return `/centres?${params.toString()}`;
  };
  const hrefForView = (view: 'grid' | 'list') => {
    const params = baseParams();
    params.set('sort', filters.sort);
    params.set('view', view);
    return `/centres?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Study spaces' }]} />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold">Study spaces{filters.area ? ` in ${filters.area}` : serviceArea.city ? ` in ${serviceArea.city}` : ''}</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{result.total} centre{result.total === 1 ? '' : 's'} found</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Live availability, verified reviews &amp; transparent prices.</p>
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

      {/* Main Search & Listings Area */}
      <div>
        <CentreSearchBar filters={filters} />

        {result.items.length === 0 ? (
          <CentreEmptyState />
        ) : filters.view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {result.items.map((c, i) => <CentreCard key={c.id} centre={c} isSaved={savedIds.has(c.id)} index={i} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {result.items.map((c) => <CentreListRow key={c.id} centre={c} />)}
          </div>
        )}

        <PaginationBar page={result.page} totalPages={result.totalPages} hrefForPage={hrefForPage} />
      </div>

      {/* Bottom Callout Section: List Your Space & Help — After all listings */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card className="bg-primary/5 border border-primary/20 p-6 flex flex-col justify-between rounded-2xl shadow-xs">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">List your study space</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Reach students looking for the perfect place to study.
            </p>
          </div>
          <div className="mt-5">
            <Link
              href="/owner/centres/new"
              className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-xs"
            >
              List your centre →
            </Link>
          </div>
        </Card>

        <Card className="p-6 border border-border flex flex-col justify-between rounded-2xl shadow-xs">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Need help?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Our support team is here to help you find the perfect study space.
            </p>
          </div>
          <div className="mt-5">
            <a
              href="mailto:support@studynook.app"
              className="inline-flex items-center gap-2 rounded-xl border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
            >
              ✉ Email support
            </a>
          </div>
        </Card>
      </div>

      {/* Trust strip */}
      <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border p-6 sm:grid-cols-4">
        {[
          ['🛡', 'Verified centres', 'All centres are verified for your safety'],
          ['⚡', 'Instant booking', 'Book your seat instantly in just a few clicks'],
          ['🔒', 'Secure payment', '100% secure payments with Razorpay'],
          ['📡', 'Live availability', 'Real seat counts, always up to date'],
        ].map(([icon, title, body]) => (
          <div key={title} className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>{icon}</span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
