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

  const [{ data: centre }, { data: resource }, { data: selectedAmenities }, { data: amenities }] = await Promise.all([
    db.from('centres').select('id, owner_id, name, address, space_type, lat, lng, description, women_safe_verified').eq('id', id).maybeSingle(),
    db.from('resources').select('unit_count, pricing').eq('centre_id', id).limit(1).maybeSingle(),
    db.from('centre_amenities').select('amenity_id').eq('centre_id', id),
    db.from('amenities').select('id, label, icon').order('sort_order'),
  ]);

  if (!centre || centre.owner_id !== user.id) notFound(); // owner-scoped

  const pricing = (resource?.pricing ?? {}) as Record<string, number>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">Edit “{centre.name}”</h1>
      <ListingForm
        mode="edit"
        centreId={centre.id}
        amenities={amenities ?? []}
        defaults={{
          name: centre.name,
          address: centre.address ?? '',
          spaceType: centre.space_type,
          lat: centre.lat ?? 0,
          lng: centre.lng ?? 0,
          about: centre.description ?? '',
          priceDaily: pricing.day,
          priceMonthly: pricing.month,
          seats: resource?.unit_count ?? 10,
          womenSafeClaim: centre.women_safe_verified ?? false,
          amenityIds: (selectedAmenities ?? []).map((a) => a.amenity_id),
        }}
      />
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold">Photos</h2>
        <ImageUploader centreId={centre.id} />
      </section>
    </main>
  );
}
