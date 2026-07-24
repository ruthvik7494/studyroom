import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCentreForAdminEdit } from '@/features/admin/services/admin.service';
import { EditCentreForm } from '@/features/admin/components/edit-centre-form';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Edit Centre', ...noindex };

interface PageProps { params: Promise<{ id: string }> }

export default async function AdminEditCentrePage({ params }: PageProps) {
  const { id } = await params;
  const db = await createClient();
  const centre = await getCentreForAdminEdit(db, id);
  if (!centre) notFound();

  return (
    <section aria-labelledby="edit-centre-heading">
      <h2 id="edit-centre-heading" className="mb-4 font-display text-lg font-bold">Edit Centre</h2>
      <EditCentreForm centre={centre} />
    </section>
  );
}
