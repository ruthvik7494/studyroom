import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAllCentres } from '@/features/admin/services/admin.service';
import { DeleteCentreButton } from '@/features/admin/components/delete-centre-button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { noindex } from '@/lib/seo';

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

interface PageProps { searchParams: Promise<{ q?: string; page?: string }> }

export default async function AllCentresPage({ searchParams }: PageProps) {
  const { q, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const db = await createClient();
  const result = await getAllCentres(db, { q, page, pageSize: PAGE_SIZE });

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(p));
    return `/admin/centres/all?${params.toString()}`;
  };

  return (
    <section aria-labelledby="all-centres-heading">
      <h2 id="all-centres-heading" className="mb-4 font-display text-lg font-bold">All Centres</h2>

      <Card className="overflow-hidden rounded-2xl">
        {/* Search — same GET form/behavior, redesigned as an inset pill search bar */}
        <div className="border-b p-4">
          <form action="/admin/centres/all" method="get" className="relative max-w-md">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <SearchIcon />
            </span>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search"
              aria-label="Search by name"
              className="h-12 w-full rounded-xl border bg-background pl-11 pr-24 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg">Search</Button>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">{result.total} centre{result.total === 1 ? '' : 's'}</p>
        </div>

        {result.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-3xl" aria-hidden>🏢</span>
            <p className="mt-2 font-display font-semibold">{q ? 'No centres match that search' : 'No centres yet'}</p>
            <p className="text-sm text-muted-foreground">{q ? 'Try a different name.' : 'Use Create Centre to add the first one.'}</p>
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
                        <Link href={`/admin/centres/${c.id}/edit`} className="text-sm font-semibold text-primary hover:underline">Edit</Link>
                        <DeleteCentreButton centreId={c.id} />
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
