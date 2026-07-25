import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { ListingForm } from '@/features/centres/components/listing-form';
import { ImageUploader } from '@/features/centres/components/image-uploader';

export const metadata: Metadata = { title: 'Edit listing', ...noindex };

interface PageProps { params: Promise<{ id: string }> }

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole('owner');
  const db = await createClient();

  const { data: centre } = await db
    .from('centres')
    .select('id, owner_id, name, area, space_type, lat, lng, emoji, description')
    .eq('id', id)
    .maybeSingle();

  if (!centre || centre.owner_id !== user.id) notFound(); // owner-scoped

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">Edit “{centre.name}”</h1>
      <ListingForm
        mode="edit"
        centreId={centre.id}
        defaults={{
          name: centre.name,
          area: centre.area ?? '',
          spaceType: centre.space_type,
          lat: centre.lat ?? 0,
          lng: centre.lng ?? 0,
          emoji: centre.emoji,
          about: centre.description ?? '',
        }}
      />
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Photos</h2>
        <ImageUploader centreId={centre.id} />
      </section>
    </main>
  );
}
