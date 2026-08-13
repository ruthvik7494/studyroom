import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { ListingWizardV2 } from '@/features/centres/components/listing-wizard-v2';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'New listing', ...noindex };

export default async function NewListingPage() {
  await requireRole('owner'); // server gate (middleware also guards /owner)
  const db = await createClient();
  const { data: amenities } = await db.from('amenities').select('id, label, icon').order('sort_order');

  return (
    <div className="w-full">
      <ListingWizardV2 mode="create" amenities={amenities ?? []} intro="Add your study space. It stays a draft until you submit it for review." />
    </div>
  );
}
