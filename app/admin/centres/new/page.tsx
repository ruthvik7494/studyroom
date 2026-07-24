import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { noindex } from '@/lib/seo';
import { CreateCentreForm } from '@/features/admin/components/create-centre-form';

export const metadata: Metadata = { title: 'Create Centre', ...noindex };

export default async function AdminCreateCentrePage() {
  const db = await createClient();
  const { data: amenities } = await db
    .from('amenities')
    .select('id, label, icon')
    .order('sort_order');

  return (
    <section aria-labelledby="create-centre-heading">
      <h2 id="create-centre-heading" className="mb-4 font-display text-lg font-bold">Create Centre</h2>
      <CreateCentreForm amenities={amenities ?? []} />
    </section>
  );
}
