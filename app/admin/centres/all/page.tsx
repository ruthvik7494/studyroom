import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAllCentres } from '@/features/admin/services/admin.service';
import { DeleteCentreButton } from '@/features/admin/components/delete-centre-button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'All Centres', ...noindex };

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  approved: 'success',
  pending_review: 'warning',
  rejected: 'destructive',
  suspended: 'destructive',
  archived: 'secondary',
  draft: 'secondary',
};

export default async function AllCentresPage() {
  const db = await createClient();
  const centres = await getAllCentres(db);

  return (
    <section aria-labelledby="all-centres-heading">
      <h2 id="all-centres-heading" className="mb-4 font-display text-lg font-bold">All Centres</h2>

      {centres.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-3xl" aria-hidden>🏢</span>
          <p className="mt-2 font-display font-semibold">No centres yet</p>
          <p className="text-sm text-muted-foreground">Use Create Centre to add the first one.</p>
        </Card>
      ) : (
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
            {centres.map((c) => (
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
      )}
    </section>
  );
}
