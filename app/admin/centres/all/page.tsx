import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAllCentres } from '@/features/admin/services/admin.service';
import { DeleteCentreButton } from '@/features/admin/components/delete-centre-button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

      <form action="/admin/centres/all" method="get" className="mb-4 flex max-w-sm gap-2">
        <Input name="q" defaultValue={q ?? ''} placeholder="Search by name" aria-label="Search by name" />
        <Button type="submit">Search</Button>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">{result.total} centre{result.total === 1 ? '' : 's'}</p>

      {result.items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-3xl" aria-hidden>🏢</span>
          <p className="mt-2 font-display font-semibold">{q ? 'No centres match that search' : 'No centres yet'}</p>
          <p className="text-sm text-muted-foreground">{q ? 'Try a different name.' : 'Use Create Centre to add the first one.'}</p>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.address ?? c.area ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.owner?.full_name ?? '—'}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[c.status] ?? 'secondary'}>{c.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/centres/${c.id}/edit`} className="text-sm font-semibold text-primary hover:underline">Edit</Link>
                      <DeleteCentreButton centreId={c.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar page={result.page} totalPages={result.totalPages} hrefForPage={hrefForPage} />
        </>
      )}
    </section>
  );
}
