import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { ListingWizard } from '@/features/centres/components/listing-wizard';
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
    db.from('centres').select('id, owner_id, name, address, city, state, country, postcode, space_type, lat, lng, description, women_safe_verified, cover_url, logo_url, phone, alt_phone, business_email, website, social').eq('id', id).maybeSingle(),
    db.from('resources').select('unit_count, pricing').eq('centre_id', id).limit(1).maybeSingle(),
    db.from('centre_amenities').select('amenity_id').eq('centre_id', id),
    db.from('amenities').select('id, label, icon').order('sort_order'),
    db.from('listing_images').select('id, storage_path, is_cover, category').eq('centre_id', id).order('sort_order', { ascending: true }),
    db.from('centre_hours').select('day_of_week, is_open, opening_time, closing_time').eq('centre_id', id),
  ]);

  if (!centre || centre.owner_id !== user.id) notFound(); // owner-scoped

  const pricing = (resource?.pricing ?? {}) as Record<string, number>;
  const social = (centre.social ?? {}) as Record<string, string>;
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
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">Edit “{centre.name}”</h1>
      <ListingWizard
        mode="edit"
        centreId={centre.id}
        amenities={amenities ?? []}
        defaults={{
          name: centre.name,
          address: centre.address ?? '',
          city: centre.city ?? '',
          state: centre.state ?? '',
          country: centre.country ?? 'India',
          postcode: centre.postcode ?? '',
          spaceType: centre.space_type,
          lat: centre.lat ?? 0,
          lng: centre.lng ?? 0,
          about: centre.description ?? '',
          phone: centre.phone ?? '',
          altPhone: centre.alt_phone ?? '',
          businessEmail: centre.business_email ?? '',
          website: centre.website ?? '',
          priceHourly: pricing.hour,
          priceDaily: pricing.day,
          priceWeekly: pricing.week,
          priceFortnightly: pricing.fortnight,
          priceMonthly: pricing.month,
          priceQuarterly: pricing.quarter,
          priceHalfYearly: pricing.half_year,
          priceYearly: pricing.year,
          seats: resource?.unit_count ?? 10,
          womenSafeClaim: centre.women_safe_verified ?? false,
          amenityIds: (selectedAmenities ?? []).map((a) => a.amenity_id),
          hours,
          facebook: social.facebook ?? '',
          instagram: social.instagram ?? '',
          youtube: social.youtube ?? '',
          linkedin: social.linkedin ?? '',
          twitter: social.twitter ?? '',
          whatsapp: social.whatsapp ?? '',
          googleBusiness: social.googleBusiness ?? '',
        }}
      />

      <section className="mt-8 max-w-3xl space-y-6 border-t pt-8">
        <h2 className="font-display text-lg font-bold">Current photos</h2>
        <p className="text-sm text-muted-foreground">
          Manage what's already uploaded here. To add new ones, use the Profile &amp; Category / Gallery steps above and save.
        </p>

        {centre.logo_url && (
          <div>
            <p className="mb-1 text-sm font-medium">Logo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={centre.logo_url} alt="" className="h-16 w-16 rounded-lg border object-cover" />
          </div>
        )}

        {centre.cover_url && coverImage && (
          <div>
            <p className="mb-1 text-sm font-medium">Cover image</p>
            <div className="relative h-40 w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={centre.cover_url} alt="" className="h-full w-full rounded-lg object-cover" />
              <DeletePhotoButton imageId={coverImage.id} />
            </div>
          </div>
        )}

        {gallery.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Gallery ({gallery.length})</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {gallery.map((img) => (
                <div key={img.id} className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryUrl(img.storage_path)} alt="" className="h-full w-full rounded-lg object-cover" />
                  {img.category && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{img.category}</span>}
                  <DeletePhotoButton imageId={img.id} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
