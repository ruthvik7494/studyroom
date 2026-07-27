'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { admin as adminDb } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { centreUpsertSchema, socialLinksSchema, centreAmenitiesSchema, centreDocumentSchema } from './schema';
import type { Result } from '@/lib/result';
import { ActionError, ok, err } from '@/lib/result';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

/**
 * Create a centre for the signed-in owner.
 * Security: requireRole('owner') (RBAC) + RLS insert policy (defense in depth) +
 * Zod validation of every field. Returns a typed Result the form can render.
 */
export async function createCentre(raw: unknown): Promise<Result<{ id: string; slug: string }>> {
  return action(centreUpsertSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const supabase = await createClient();

    let slug = slugify(input.name);
    const { data: clash } = await supabase.from('centres').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: centre, error } = await supabase.from('centres').insert({
      owner_id: user.id,
      name: input.name,
      slug,
      area: input.address, // area still backs /locations/[slug] filtering — kept in sync with the single Address field
      address: input.address,
      city: input.city || null,
      state: input.state || null,
      country: input.country || 'India',
      postcode: input.postcode || null,
      space_type: input.spaceType,
      lat: input.lat,
      lng: input.lng,
      emoji: input.emoji,
      phone: input.phone ?? null,
      alt_phone: input.altPhone || null,
      business_email: input.businessEmail || null,
      website: input.website || null,
      google_place_id: input.googlePlaceId ?? null,
      description: input.about || null,
      capacity: input.seats, // drives the "seats free" occupancy badge — was missing entirely, defaulted to 0
      is_published: false,
      // is_verified is deliberately NOT settable here — that's an admin
      // attestation, reviewed alongside the listing during approval, not
      // something an owner can claim for themselves.
      women_safe_verified: input.womenSafeClaim ?? false,
      social: {
        facebook: input.facebook || undefined,
        instagram: input.instagram || undefined,
        youtube: input.youtube || undefined,
        linkedin: input.linkedin || undefined,
        twitter: input.twitter || undefined,
        whatsapp: input.whatsapp || undefined,
        googleBusiness: input.googleBusiness || undefined,
      },
    }).select('id, slug').single();
    if (error) throw error;

    const pricing: Record<string, number> = {};
    if (input.priceHourly !== undefined) pricing.hour = input.priceHourly;
    if (input.priceDaily !== undefined) pricing.day = input.priceDaily;
    if (input.priceWeekly !== undefined) pricing.week = input.priceWeekly;
    if (input.priceFortnightly !== undefined) pricing.fortnight = input.priceFortnightly;
    if (input.priceMonthly !== undefined) pricing.month = input.priceMonthly;
    if (input.priceQuarterly !== undefined) pricing.quarter = input.priceQuarterly;
    if (input.priceHalfYearly !== undefined) pricing.half_year = input.priceHalfYearly;
    if (input.priceYearly !== undefined) pricing.year = input.priceYearly;

    const { error: resourceErr } = await supabase.from('resources').insert({
      centre_id: centre.id,
      resource_type: 'seat',
      tier: 'open',
      label: 'General seating',
      unit_count: input.seats,
      pricing,
    });
    if (resourceErr) throw resourceErr;

    if (input.amenityIds && input.amenityIds.length) {
      const rows = input.amenityIds.map((amenity_id) => ({ centre_id: centre.id, amenity_id }));
      const { error: amenityErr } = await supabase.from('centre_amenities').insert(rows);
      if (amenityErr) throw amenityErr;
    }

    if (input.hours && input.hours.length) {
      const hourRows = input.hours.map((d, dayOfWeek) => ({
        centre_id: centre.id,
        day_of_week: dayOfWeek,
        is_open: d.isOpen,
        opening_time: d.isOpen ? `${d.openingTime}:00` : null,
        closing_time: d.isOpen ? `${d.closingTime}:00` : null,
      }));
      const { error: hoursErr } = await supabase.from('centre_hours').insert(hourRows);
      if (hoursErr) throw hoursErr;
    }

    revalidatePath('/centres');
    return { id: centre.id, slug: centre.slug };
  });
}

/* ---------------------------------------------------------------------------
 * Owner listing management: update, submit-for-review, register an image row.
 * ------------------------------------------------------------------------- */

const updateSchema = centreUpsertSchema.partial().extend({ centreId: z.string().uuid() });

/** Update an owner's own listing (any field of the upsert schema). */
export async function updateCentre(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(updateSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    const { centreId, ...fields } = input;

    // Ownership is enforced by RLS; this pre-check gives a friendly error.
    const { data: owned } = await db.from('centres').select('owner_id').eq('id', centreId).maybeSingle();
    if (!owned || owned.owner_id !== user.id) throw new ActionError('FORBIDDEN', 'That listing isn’t yours to edit.');

    const patch: Record<string, unknown> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.address !== undefined) { patch.address = fields.address; patch.area = fields.address; }
    if (fields.city !== undefined) patch.city = fields.city || null;
    if (fields.state !== undefined) patch.state = fields.state || null;
    if (fields.country !== undefined) patch.country = fields.country || 'India';
    if (fields.postcode !== undefined) patch.postcode = fields.postcode || null;
    if (fields.spaceType !== undefined) patch.space_type = fields.spaceType;
    if (fields.lat !== undefined) patch.lat = fields.lat;
    if (fields.lng !== undefined) patch.lng = fields.lng;
    if (fields.phone !== undefined) patch.phone = fields.phone || null;
    if (fields.altPhone !== undefined) patch.alt_phone = fields.altPhone || null;
    if (fields.businessEmail !== undefined) patch.business_email = fields.businessEmail || null;
    if (fields.website !== undefined) patch.website = fields.website || null;
    if (fields.about !== undefined) patch.description = fields.about || null;
    if (fields.womenSafeClaim !== undefined) patch.women_safe_verified = fields.womenSafeClaim;
    if (
      fields.facebook !== undefined || fields.instagram !== undefined || fields.youtube !== undefined ||
      fields.linkedin !== undefined || fields.twitter !== undefined || fields.whatsapp !== undefined ||
      fields.googleBusiness !== undefined
    ) {
      patch.social = {
        facebook: fields.facebook || undefined,
        instagram: fields.instagram || undefined,
        youtube: fields.youtube || undefined,
        linkedin: fields.linkedin || undefined,
        twitter: fields.twitter || undefined,
        whatsapp: fields.whatsapp || undefined,
        googleBusiness: fields.googleBusiness || undefined,
      };
    }

    if (Object.keys(patch).length) {
      const { error } = await db.from('centres').update(patch as never).eq('id', centreId);
      if (error) throw error;
    }

    // Pricing/seats live on the centre's resource row, not on centres itself.
    const priceFields = [
      fields.priceHourly, fields.priceDaily, fields.priceWeekly, fields.priceFortnightly,
      fields.priceMonthly, fields.priceQuarterly, fields.priceHalfYearly, fields.priceYearly,
    ];
    if (priceFields.some((v) => v !== undefined) || fields.seats !== undefined) {
      const { data: resource } = await db.from('resources').select('id, pricing').eq('centre_id', centreId).limit(1).maybeSingle();
      if (resource) {
        const resourcePatch: Record<string, unknown> = {};
        if (fields.seats !== undefined) resourcePatch.unit_count = fields.seats;
        if (priceFields.some((v) => v !== undefined)) {
          const pricing: Record<string, number> = {};
          if (fields.priceHourly !== undefined) pricing.hour = fields.priceHourly;
          if (fields.priceDaily !== undefined) pricing.day = fields.priceDaily;
          if (fields.priceWeekly !== undefined) pricing.week = fields.priceWeekly;
          if (fields.priceFortnightly !== undefined) pricing.fortnight = fields.priceFortnightly;
          if (fields.priceMonthly !== undefined) pricing.month = fields.priceMonthly;
          if (fields.priceQuarterly !== undefined) pricing.quarter = fields.priceQuarterly;
          if (fields.priceHalfYearly !== undefined) pricing.half_year = fields.priceHalfYearly;
          if (fields.priceYearly !== undefined) pricing.year = fields.priceYearly;
          resourcePatch.pricing = pricing;
        }
        const { error: resourceErr } = await db.from('resources').update(resourcePatch as never).eq('id', resource.id);
        if (resourceErr) throw resourceErr;
      }
    }

    // Facilities: full replace, same pattern as setCentreAmenities.
    if (fields.amenityIds !== undefined) {
      await db.from('centre_amenities').delete().eq('centre_id', centreId);
      if (fields.amenityIds.length) {
        const rows = fields.amenityIds.map((amenity_id) => ({ centre_id: centreId, amenity_id }));
        const { error: amenityErr } = await db.from('centre_amenities').insert(rows);
        if (amenityErr) throw amenityErr;
      }
    }

    // Weekly hours: full replace (7 rows, one per day of week).
    if (fields.hours !== undefined) {
      await db.from('centre_hours').delete().eq('centre_id', centreId);
      const hourRows = fields.hours.map((d, dayOfWeek) => ({
        centre_id: centreId,
        day_of_week: dayOfWeek,
        is_open: d.isOpen,
        opening_time: d.isOpen ? `${d.openingTime}:00` : null,
        closing_time: d.isOpen ? `${d.closingTime}:00` : null,
      }));
      const { error: hoursErr } = await db.from('centre_hours').insert(hourRows);
      if (hoursErr) throw hoursErr;
    }

    revalidatePath('/owner/centres');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}

const submitSchema = z.object({ centreId: z.string().uuid() });

/** Submit a draft for admin review (draft/rejected → pending_review). */
export async function submitForReview(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(submitSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    const { data: owned } = await db.from('centres').select('owner_id, status').eq('id', input.centreId).maybeSingle();
    if (!owned || owned.owner_id !== user.id) throw new ActionError('FORBIDDEN', 'That listing isn’t yours.');
    if (owned.status === 'approved') throw new ActionError('CONFLICT', 'This listing is already live.');

    const { error } = await db.from('centres').update({ status: 'pending_review' }).eq('id', input.centreId);
    if (error) throw error;
    revalidatePath('/owner/centres');
    return { ok: true as const };
  });
}

const imageSchema = z.object({ centreId: z.string().uuid(), storagePath: z.string().min(1), isCover: z.boolean().optional() });

/** Register an uploaded Storage object as a listing image row. */
export async function registerListingImage(raw: unknown): Promise<Result<{ id: string }>> {
  return action(imageSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    const { data: owned } = await db.from('centres').select('owner_id').eq('id', input.centreId).maybeSingle();
    if (!owned || owned.owner_id !== user.id) throw new ActionError('FORBIDDEN', 'That listing isn’t yours.');

    const { data, error } = await db.from('listing_images')
      .insert({ centre_id: input.centreId, storage_path: input.storagePath, is_cover: input.isCover ?? false })
      .select('id').single();
    if (error) throw error;
    revalidatePath('/owner/centres');
    return { id: data.id };
  });
}

const coverImageSchema = z.object({ centreId: z.string().uuid(), storagePath: z.string().min(1) });

/**
 * Set the centre's main/hero image. `centres.cover_url` — not
 * `listing_images.is_cover` — is what the discovery cards and the detail
 * page's hero actually render (see centre-card.tsx / centres/[slug]/page.tsx),
 * so a cover upload has to land here to actually show up anywhere.
 */
export async function setCentreCoverImage(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(coverImageSchema, raw, async (input) => {
    const user = await requireRole('owner'); // admin passes any role check (see requireRole)
    const db = await createClient();
    await assertOwnsCentre(db, input.centreId, user.id);

    const { data: pub } = db.storage.from('listing-images').getPublicUrl(input.storagePath);
    const { error } = await db.from('centres').update({ cover_url: pub.publicUrl }).eq('id', input.centreId);
    if (error) throw error;
    revalidatePath('/owner/centres');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}

/** Shared ownership guard: the caller must own the centre (or be admin via RLS). */
async function assertOwnsCentre(db: Awaited<ReturnType<typeof createClient>>, centreId: string, userId: string) {
  const { data: owned } = await db.from('centres').select('owner_id').eq('id', centreId).maybeSingle();
  if (!owned || owned.owner_id !== userId) throw new ActionError('FORBIDDEN', 'That listing isn’t yours.');
}

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Trusted image upload for the owner create-listing flow (mirrors
 * features/admin/actions.ts's adminUploadCentreImage). Uploading straight from
 * the browser using the owner's own session — the pattern the standalone
 * ImageUploader component uses on the edit page — hit a Storage RLS rejection
 * for the equivalent admin case (a fresh centre, uploaded to immediately after
 * creation), so the create flow uses this server-side path instead: verify
 * ownership first, then write with the service-role client, bypassing the
 * same RLS layer that was rejecting the request.
 */
export async function uploadCentreImage(formData: FormData): Promise<Result<{ storagePath: string }>> {
  const user = await requireRole('owner'); // admin passes any role check too

  const centreId = formData.get('centreId');
  const isCover = formData.get('isCover') === 'true';
  const category = formData.get('category'); // e.g. "Reception", "Reading Hall" — optional labeled-slot tag
  const file = formData.get('file');

  if (typeof centreId !== 'string' || !centreId) return err('VALIDATION', 'Missing centre.');
  if (!(file instanceof File)) return err('VALIDATION', 'No file provided.');
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return err('VALIDATION', `${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.`);
  }
  if (file.size > 5 * 1024 * 1024) return err('VALIDATION', 'Image must be under 5 MB.');

  const { data: centre } = await adminDb.from('centres').select('id, owner_id').eq('id', centreId).maybeSingle();
  if (!centre) return err('NOT_FOUND', 'Centre not found.');
  if (centre.owner_id !== user.id && user.role !== 'admin') return err('FORBIDDEN', 'That listing isn’t yours.');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${centreId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await adminDb.storage.from('listing-images').upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) return err('INTERNAL', `Upload failed: ${upErr.message}`);

  if (isCover) {
    // Only one row per centre may have is_cover = true (uq_listing_cover) —
    // demote the existing cover to a regular gallery photo first, rather
    // than leaving it to violate the constraint on insert below.
    const { error: demoteErr } = await adminDb.from('listing_images').update({ is_cover: false }).eq('centre_id', centreId).eq('is_cover', true);
    if (demoteErr) return err('INTERNAL', demoteErr.message);
  }

  const { error: insErr } = await adminDb.from('listing_images')
    .insert({ centre_id: centreId, storage_path: path, is_cover: isCover, category: typeof category === 'string' && category ? category : null });
  if (insErr) return err('INTERNAL', insErr.message);

  if (isCover) {
    const { data: pub } = adminDb.storage.from('listing-images').getPublicUrl(path);
    const { error: coverErr } = await adminDb.from('centres').update({ cover_url: pub.publicUrl }).eq('id', centreId);
    if (coverErr) return err('INTERNAL', coverErr.message);
  }

  revalidatePath('/owner/centres');
  revalidatePath('/centres');
  return ok({ storagePath: path });
}

/** Upload the centre's business logo (separate from the cover photo). Same trusted-upload pattern. */
export async function uploadCentreLogo(formData: FormData): Promise<Result<{ url: string }>> {
  const user = await requireRole('owner');

  const centreId = formData.get('centreId');
  const file = formData.get('file');
  if (typeof centreId !== 'string' || !centreId) return err('VALIDATION', 'Missing centre.');
  if (!(file instanceof File)) return err('VALIDATION', 'No file provided.');
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return err('VALIDATION', `${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.`);
  }
  if (file.size > 5 * 1024 * 1024) return err('VALIDATION', 'Image must be under 5 MB.');

  const { data: centre } = await adminDb.from('centres').select('id, owner_id').eq('id', centreId).maybeSingle();
  if (!centre) return err('NOT_FOUND', 'Centre not found.');
  if (centre.owner_id !== user.id && user.role !== 'admin') return err('FORBIDDEN', 'That listing isn’t yours.');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${centreId}/logo-${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await adminDb.storage.from('listing-images').upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) return err('INTERNAL', `Upload failed: ${upErr.message}`);

  const { data: pub } = adminDb.storage.from('listing-images').getPublicUrl(path);
  const { error: updErr } = await adminDb.from('centres').update({ logo_url: pub.publicUrl }).eq('id', centreId);
  if (updErr) return err('INTERNAL', updErr.message);

  revalidatePath('/owner/centres');
  revalidatePath('/centres');
  return ok({ url: pub.publicUrl });
}

/** Replace the centre's amenity set with the selected amenity IDs. */
export async function setCentreAmenities(raw: unknown): Promise<Result<{ count: number }>> {
  return action(centreAmenitiesSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    await assertOwnsCentre(db, input.centreId, user.id);

    // full-replace: clear then insert the current selection
    await db.from('centre_amenities').delete().eq('centre_id', input.centreId);
    if (input.amenityIds.length) {
      const rows = input.amenityIds.map((amenity_id) => ({ centre_id: input.centreId, amenity_id }));
      const { error } = await db.from('centre_amenities').insert(rows);
      if (error) throw error;
    }
    revalidatePath('/owner/centres');
    return { count: input.amenityIds.length };
  });
}

/** Save the centre's social links (all validated as http(s) URLs). */
export async function updateSocialLinks(raw: unknown): Promise<Result<{ ok: true }>> {
  const schema = socialLinksSchema.and(z.object({ centreId: z.string().uuid() }));
  return action(schema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    await assertOwnsCentre(db, input.centreId, user.id);

    const { centreId, ...social } = input;
    const { error } = await db.from('centres').update({ social }).eq('id', centreId);
    if (error) throw error;
    revalidatePath('/owner/centres');
    return { ok: true as const };
  });
}

/** Register an uploaded verification document (Storage object → DB row). */
export async function registerDocument(raw: unknown): Promise<Result<{ id: string }>> {
  return action(centreDocumentSchema, raw, async (input) => {
    const user = await requireRole('owner');
    const db = await createClient();
    await assertOwnsCentre(db, input.centreId, user.id);

    const { data, error } = await db.from('centre_documents')
      .insert({ centre_id: input.centreId, storage_path: input.storagePath, doc_type: input.docType, label: input.label ?? null })
      .select('id').single();
    if (error) throw error;
    revalidatePath('/owner/centres');
    return { id: data.id };
  });
}

const deleteImageSchema = z.object({ imageId: z.string().uuid() });

/**
 * Delete a gallery/cover photo — removes both the Storage object and the
 * listing_images row. Uses the service-role client for the same reason the
 * upload path does: ownership is verified explicitly first, then the write
 * proceeds without depending on the Storage RLS layer that's been unreliable
 * elsewhere in this flow. If the deleted photo was the cover, cover_url is
 * cleared too, so the detail page doesn't keep pointing at a removed file.
 */
export async function deleteListingImage(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(deleteImageSchema, raw, async (input) => {
    const user = await requireRole('owner'); // admin passes any role check too

    const { data: img } = await adminDb
      .from('listing_images')
      .select('id, centre_id, storage_path, is_cover, centres:centre_id(owner_id)')
      .eq('id', input.imageId)
      .maybeSingle();
    if (!img) return { ok: true as const }; // already gone — nothing to do

    const ownerId = (img.centres as unknown as { owner_id: string } | null)?.owner_id;
    if (ownerId !== user.id && user.role !== 'admin') throw new ActionError('FORBIDDEN', 'That photo isn’t yours to remove.');

    await adminDb.storage.from('listing-images').remove([img.storage_path]);
    const { error } = await adminDb.from('listing_images').delete().eq('id', input.imageId);
    if (error) throw error;

    if (img.is_cover) {
      await adminDb.from('centres').update({ cover_url: null }).eq('id', img.centre_id);
    }

    revalidatePath('/owner/centres');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}
