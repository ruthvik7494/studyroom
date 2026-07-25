import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { ListingForm } from '@/features/centres/components/listing-form';
import { ImageUploader } from '@/features/centres/components/image-uploader';
import { DeletePhotoButton } from '@/features/centres/components/delete-photo-button';

export const metadata: Metadata = { title: 'Edit listing', ...noindex };

interface PageProps { params: Promise<{ id: string }> }

const galleryUrl = (path: string) =>
  path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole('owner');
  const db = await createClient();

  const [{ data: centre }, { data: resource }, { data: selectedAmenities }, { data: amenities }, { data: images }, { data: hoursRows }] = await Promise.all([
    db.from('centres').select('id, owner_id, name, address, space_type, lat, lng, description, women_safe_verified, cover_url').eq('id', id).maybeSingle(),
    db.from('resources').select('unit_count, pricing').eq('centre_id', id).limit(1).maybeSingle(),
    db.from('centre_amenities').select('amenity_id').eq('centre_id', id),
    db.from('amenities').select('id, label, icon').order('sort_order'),
    db.from('listing_images').select('id, storage_path, is_cover').eq('centre_id', id).order('sort_order', { ascending: true }),
    db.from('centre_hours').select('day_of_week, is_open, opening_time, closing_time').eq('centre_id', id),
  ]);

  if (!centre || centre.owner_id !== user.id) notFound(); // owner-scoped

  const pricing = (resource?.pricing ?? {}) as Record<string, number>;
  const coverImage = images?.find((img) => img.is_cover);
  const gallery = (images ?? []).filter((img) => !img.is_cover);
  const hours = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const row = hoursRows?.find((h) => h.day_of_week === dayOfWeek);
    return {
      isOpen: row?.is_open ?? true,
      openingTime: row?.opening_time?.slice(0, 5) ?? '06:00',
      closingTime: row?.closing_time?.slice(0, 5) ?? '22:00',
    };
  });

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
          hours,
        }}
      />

      <section className="mt-8 max-w-xl space-y-6">
        <div>
          <h2 className="mb-2 font-display text-lg font-bold">Header Image / Cover Image</h2>
          {centre.cover_url && coverImage && (
            <div className="relative mb-3 h-40 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={centre.cover_url} alt="" className="h-full w-full rounded-lg object-cover" />
              <DeletePhotoButton imageId={coverImage.id} />
            </div>
          )}
          <ImageUploader centreId={centre.id} isCover label="Upload the main/cover photo" />
        </div>

        <div>
          <h2 className="mb-2 font-display text-lg font-bold">Gallery</h2>
          {gallery.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {gallery.map((img) => (
                <div key={img.id} className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryUrl(img.storage_path)} alt="" className="h-full w-full rounded-lg object-cover" />
                  <DeletePhotoButton imageId={img.id} />
                </div>
              ))}
            </div>
          )}
          <ImageUploader centreId={centre.id} multiple label="Upload gallery photos (select several at once)" />
        </div>
      </section>
    </main>
  );
}
