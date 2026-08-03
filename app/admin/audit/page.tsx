import { createClient } from '@/lib/supabase/server';
import { getAuditLog } from '@/features/admin/services/admin.service';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AdminAuditPage() {
  const db = await createClient();
  const entries = await getAuditLog(db);

  return (
    <section aria-labelledby="audit-heading">
      <h2 id="audit-heading" className="mb-4 font-display text-lg font-bold">Audit log</h2>
      {entries.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted-foreground">No audit entries yet.</Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell><Badge variant="secondary">{e.action}</Badge></TableCell>
                  <TableCell className="text-sm">{e.entity_type}<span className="text-muted-foreground"> · {e.entity_id?.slice(0, 8)}</span></TableCell>
                  <TableCell className="text-sm">{e.actor?.full_name ?? 'system'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
