import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { ListingWizardV2 } from '@/features/centres/components/listing-wizard-v2';
import type { CentreUpsert } from '@/features/centres/schema';

export const metadata: Metadata = { title: 'Edit listing', ...noindex };

interface PageProps { params: Promise<{ id: string }> }

const galleryUrl = (path: string) =>
  path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRole('owner');
  const db = await createClient();

  const [{ data: centre }, { data: allResources }, { data: selectedAmenities }, { data: amenities }, { data: images }, { data: hoursRows }] = await Promise.all([
    db.from('centres').select('id, owner_id, name, address, city, state, country, postcode, space_type, lat, lng, description, women_safe_verified, cover_url, logo_url, phone, alt_phone, business_email, website, social, tags').eq('id', id).maybeSingle(),
    db.from('resources').select('id, unit_count, pricing, label').eq('centre_id', id).order('id', { ascending: true }),
    db.from('centre_amenities').select('amenity_id').eq('centre_id', id),
    db.from('amenities').select('id, label, icon').order('sort_order'),
    db.from('listing_images').select('id, storage_path, is_cover, category').eq('centre_id', id).order('sort_order', { ascending: true }),
    db.from('centre_hours').select('day_of_week, is_open, opening_time, closing_time').eq('centre_id', id),
  ]);

  if (!centre || centre.owner_id !== user.id) notFound(); // owner-scoped

  const primaryResource = allResources?.[0];
  const secondaryResources = allResources?.slice(1) || [];

  const pricing = (primaryResource?.pricing ?? {}) as Record<string, number>;
  const extraSpaces = secondaryResources.map((res, index) => {
    const p = (res.pricing ?? {}) as Record<string, number>;
    return {
      id: res.id || `extra-${index}`,
      name: res.label || `Space ${index + 2}`,
      seats: res.unit_count ? String(res.unit_count) : '',
      prices: {
        priceHourly: p.hour ? String(p.hour) : '',
        priceDaily: p.day ? String(p.day) : '',
        priceWeekly: p.week ? String(p.week) : '',
        priceMonthly: p.month ? String(p.month) : '',
        priceQuarterly: p.quarter ? String(p.quarter) : '',
        priceHalfYearly: p.half_year ? String(p.half_year) : '',
        priceYearly: p.year ? String(p.year) : '',
      },
      tags: ['AC', 'Library'],
    };
  });
  const social = (centre.social ?? {}) as Record<string, string>;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const coverImg = (images ?? []).find((img) => img.is_cover);
  const coverUrl = centre.cover_url || (coverImg ? (coverImg.storage_path.startsWith('http') ? coverImg.storage_path : `${supabaseUrl}/storage/v1/object/public/listing-images/${coverImg.storage_path}`) : null);

  const gallery = (images ?? []).map((img) => ({
    id: img.id,
    storagePath: img.storage_path,
    url: img.storage_path.startsWith('http') ? img.storage_path : `${supabaseUrl}/storage/v1/object/public/listing-images/${img.storage_path}`,
    category: img.category ?? 'gallery',
  }));
  const hours = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const row = hoursRows?.find((h) => h.day_of_week === dayOfWeek);
    return {
      isOpen: row?.is_open ?? true,
      openingTime: row?.opening_time?.slice(0, 5) ?? '09:00',
      closingTime: row?.closing_time?.slice(0, 5) ?? '22:00',
    };
  });

  return (
    <div className="">
      <h1 className="mb-6 font-display text-2xl font-bold">Edit “{centre.name}”</h1>
      <ListingWizardV2
        mode="edit"
        centreId={id}
        amenities={amenities ?? []}
        photos={{ logoUrl: centre.logo_url, coverUrl, coverImageId: null, gallery: gallery.map(g => ({ id: g.id, url: g.url, category: g.category ?? null })) }}
        defaults={{
          name: centre.name,
          roomName: primaryResource?.label || 'AC Room',
          address: centre.address ?? undefined,
          city: centre.city ?? undefined,
          state: centre.state ?? undefined,
          country: centre.country ?? undefined,
          postcode: centre.postcode ?? undefined,
          spaceType: (centre.space_type as CentreUpsert['spaceType']) ?? 'study_hall',
          lat: centre.lat ?? undefined,
          lng: centre.lng ?? undefined,
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
          seats: primaryResource?.unit_count ?? 10,
          womenSafeClaim: centre.women_safe_verified ?? false,
          amenityIds: (selectedAmenities ?? []).map((a) => a.amenity_id),
          tags: (centre.tags ?? []) as CentreUpsert['tags'],
          hours,
          facebook: social.facebook ?? '',
          instagram: social.instagram ?? '',
          youtube: social.youtube ?? '',
          linkedin: social.linkedin ?? '',
          twitter: social.twitter ?? '',
          whatsapp: social.whatsapp ?? '',
          googleBusiness: social.googleBusiness ?? '',
          extraSpaces: extraSpaces as any,
        }}
      />
    </div>
  );
}
