import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { ListingWizardV2 } from '@/features/centres/components/listing-wizard-v2';

export const metadata: Metadata = { title: 'Create Centre', ...noindex };

export default async function AdminCreateCentrePage() {
  await requireRole('admin');
  const db = await createClient();
  const { data: amenities } = await db
    .from('amenities')
    .select('id, label, icon')
    .order('sort_order');

  return (
    <section aria-labelledby="create-centre-heading">
      <h2 id="create-centre-heading" className="mb-6 font-display text-2xl font-bold">Create New Centre</h2>
      <ListingWizardV2
        mode="create"
        targetRedirectUrl="/admin/centres/all"
        amenities={amenities ?? []}
      />
    </section>
  );
}

