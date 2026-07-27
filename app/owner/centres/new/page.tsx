import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { ListingWizard } from '@/features/centres/components/listing-wizard';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'New listing', ...noindex };

export default async function NewListingPage() {
  await requireRole('owner'); // server gate (middleware also guards /owner)
  const db = await createClient();
  const { data: amenities } = await db.from('amenities').select('id, label, icon').order('sort_order');

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <p className="mb-6 text-sm text-muted-foreground">Add your study space. It stays a draft until you submit it for review.</p>
      <ListingWizard mode="create" amenities={amenities ?? []} />
    </main>
  );
}
