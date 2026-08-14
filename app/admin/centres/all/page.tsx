import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAllCentres } from '@/features/admin/services/admin.service';
import { CentreModerationActions } from '@/features/admin/components/centre-moderation-actions';
import { DeleteCentreButton } from '@/features/admin/components/delete-centre-button';
import { RestoreCentreButton } from '@/features/admin/components/restore-centre-button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { noindex } from '@/lib/seo';
import { RefreshButton } from '@/components/refresh-button';

export const metadata: Metadata = { title: 'All Centres', ...noindex };

const PAGE_SIZE = 8;

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  approved: 'success',
  pending_review: 'warning',
  rejected: 'destructive',
  suspended: 'destructive',
  archived: 'secondary',
  draft: 'secondary',
};

// A small, fixed palette so each centre's initial-avatar gets a consistent
// colour (hashed from its id) instead of every row looking identical.
const AVATAR_PALETTE = [
  'bg-[hsl(210,70%,92%)] text-[hsl(210,70%,35%)]',
  'bg-[hsl(160,60%,90%)] text-[hsl(160,60%,28%)]',
  'bg-[hsl(280,55%,93%)] text-[hsl(280,45%,42%)]',
  'bg-[hsl(30,80%,92%)] text-[hsl(30,70%,35%)]',
  'bg-[hsl(340,65%,93%)] text-[hsl(340,55%,42%)]',
];
function avatarClass(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

interface PageProps { searchParams: Promise<{ q?: string; page?: string; tab?: string }> }

export default async function AllCentresPage({ searchParams }: PageProps) {
  const { q, page: pageRaw, tab: tabRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const tab = tabRaw === 'pending' ? 'pending' : tabRaw === 'archived' ? 'archived' : 'active';

  const db = await createClient();
  const result = await getAllCentres(db, {
    q,
    page,
    pageSize: PAGE_SIZE,
    showArchived: tab === 'archived',
    status: tab === 'pending' ? 'pending_review' : undefined,
  });

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (tab !== 'active') params.set('tab', tab);
    params.set('page', String(p));
    return `/admin/centres/all?${params.toString()}`;
  };
  const hrefForTab = (t: 'active' | 'pending' | 'archived') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (t !== 'active') params.set('tab', t);
    return `/admin/centres/all?${params.toString()}`;
  };

  return (
    <section aria-labelledby="all-centres-heading">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="all-centres-heading" className="font-display text-lg font-bold">All Centres</h2>
          <RefreshButton label="Refresh centres" />
        </div>
        <Link href="/admin/centres/new">
          <Button size="sm" className="font-semibold">+ Create Centre</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-1">
        <Link
          href={hrefForTab('active')}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          Active
        </Link>
        <Link
          href={hrefForTab('pending')}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          Pending Review
        </Link>
        <Link
          href={hrefForTab('archived')}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === 'archived' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
        >
          Deleted
        </Link>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        {/* Search — redesigned with wider layout, clear spacing, and prominent input bar */}
        <div className="border-b p-5 md:p-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form action="/admin/centres/all" method="get" className="relative w-full max-w-2xl">
              {tab !== 'active' && <input type="hidden" name="tab" value={tab} />}
              <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </span>
              <input
                type="text"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search centres by name, location, or owner..."
                aria-label="Search by name"
                className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-32 text-base placeholder:text-muted-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
              />
              <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-6 h-10 bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-sm shadow-xs">Search</Button>
            </form>
            <p className="text-xs md:text-sm font-semibold text-slate-500 shrink-0">
              Showing <span className="font-bold text-slate-800">{result.total}</span> centre{result.total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-3xl" aria-hidden>{tab === 'archived' ? '🗑️' : tab === 'pending' ? '✅' : '🏢'}</span>
            <p className="mt-2 font-display font-semibold">
              {q ? 'No centres match that search' : tab === 'archived' ? 'Nothing deleted' : tab === 'pending' ? 'Queue is clear' : 'No centres yet'}
            </p>
            <p className="text-sm text-muted-foreground">
              {q ? 'Try a different name.' : tab === 'archived' ? 'Deleted listings will show up here.' : tab === 'pending' ? 'No listings are waiting for review.' : 'Use Create Centre to add the first one.'}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 text-sm font-semibold normal-case tracking-normal text-foreground">Centre</TableHead>
                  <TableHead className="text-sm font-semibold normal-case tracking-normal text-foreground">Owner</TableHead>
                  <TableHead className="text-sm font-semibold normal-case tracking-normal text-foreground">Status</TableHead>
                  <TableHead className="pr-6 text-right text-sm font-semibold normal-case tracking-normal text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarClass(c.id)}`}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.address ?? c.area ?? '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.owner?.full_name ?? '—'}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[c.status] ?? 'secondary'}>{c.status}</Badge></TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/centres/${c.slug}`} target="_blank" className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline">View</Link>
                        {c.status === 'pending_review' ? (
                          <CentreModerationActions centreId={c.id} />
                        ) : tab === 'archived' ? (
                          <RestoreCentreButton centreId={c.id} />
                        ) : (
                          <>
                            <Link href={`/admin/centres/${c.id}/edit`} className="text-sm font-semibold text-primary hover:underline">Edit</Link>
                            <DeleteCentreButton centreId={c.id} />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-4 pb-4">
              <PaginationBar page={result.page} totalPages={result.totalPages} hrefForPage={hrefForPage} />
            </div>
          </>
        )}
      </Card>
    </section>
  );
}
