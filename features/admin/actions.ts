'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { admin as adminDb } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { logAudit } from '@/lib/audit';
import type { Result } from '@/lib/result';
import { ActionError, ok, err } from '@/lib/result';
import type { Database } from '@/types/database.types';
import { moderateCentreSchema, moderateReviewSchema, resolveReportSchema, moderateClaimSchema, setUserRoleSchema, setAccountStatusSchema, reviewDeletionRequestSchema } from './schema';
import { adminCentreCreateSchema, adminCentreCreateBaseSchema } from '@/features/centres/schema';
import { notifyCentreDecision } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

/**
 * Admin "Create Centre" — a fast data-entry path so staff can list a centre
 * directly, bypassing the owner submit → pending_review → approve pipeline
 * (there's no separate owner to approve here; the admin creating it IS the
 * approval). Creates the centre already `approved`, one default resource row
 * carrying the entered price, and the selected amenities, in one transaction-
 * like sequence. Photos are added in a second step from the returned centre id
 * (Storage paths are namespaced by centre id, so they can't be uploaded before
 * the row exists) via the existing ImageUploader / registerListingImage.
 */
export async function adminCreateCentre(raw: unknown): Promise<Result<{ id: string; slug: string }>> {
  return action(adminCentreCreateSchema, raw, async (input) => {
    const admin = await requireRole('admin');
    const db = await createClient();

    let slug = slugify(input.name);
    const { data: clash } = await db.from('centres').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: centre, error } = await db
      .from('centres')
      .insert({
        owner_id: admin.id, // RLS requires owner_id = auth.uid() even for admin inserts
        name: input.name,
        slug,
        address: input.address,
        description: input.about || null,
        capacity: input.seats, // drives occupancy/check-in display — separate from resources.unit_count below, kept in sync
        status: 'approved', // admin-created = admin-approved, no separate review step
        is_verified: input.isVerified,
        women_safe_verified: input.womenSafe,
      })
      .select('id, slug')
      .single();
    if (error) throw error;

    const pricing: Record<string, number> = {};
    if (input.priceHourly !== undefined) pricing.hour = input.priceHourly;
    if (input.priceDaily !== undefined) pricing.day = input.priceDaily;
    if (input.priceMonthly !== undefined) pricing.month = input.priceMonthly;

    const { error: resourceErr } = await db.from('resources').insert({
      centre_id: centre.id,
      resource_type: 'seat',
      tier: 'open',
      label: 'General seating',
      unit_count: input.seats,
      pricing,
    });
    if (resourceErr) throw resourceErr;

    const amenityIds = input.amenityIds ?? [];
    if (amenityIds.length) {
      const rows = amenityIds.map((amenity_id) => ({ centre_id: centre.id, amenity_id }));
      const { error: amenityErr } = await db.from('centre_amenities').insert(rows);
      if (amenityErr) throw amenityErr;
    }

    await logAudit('centre.admin_created', 'centre', centre.id, { name: input.name, pricing });
    revalidatePath('/admin/centres/all');
    revalidatePath('/admin/centres');
    revalidatePath('/centres');
    return { id: centre.id, slug: centre.slug };
  });
}

type ListingStatus = Database['public']['Enums']['listing_status'];

const DECISION_TO_STATUS: Record<string, ListingStatus> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  restore: 'approved',
  archive: 'archived',
};

/** Approve / reject / suspend / restore / archive a listing. Admin only, audited. */
export async function moderateCentre(raw: unknown): Promise<Result<{ status: ListingStatus }>> {
  return action(moderateCentreSchema, raw, async (input) => {
    const admin = await requireRole('admin');
    const db = await createClient();
    const status = DECISION_TO_STATUS[input.decision]!;

    // Owner must be told the outcome — fetch before the update so we have the
    // owner even if the row changes.
    const { data: centre } = await db
      .from('centres')
      .select('owner_id, name')
      .eq('id', input.centreId)
      .maybeSingle();

    const { error } = await db
      .from('centres')
      .update({
        status,
        rejection_reason: input.decision === 'reject' ? (input.reason ?? null) : null,
        admin_notes: input.reason ?? null,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', input.centreId);
    if (error) throw error;

    // Notify the owner for decisions that change their listing's visibility.
    if (centre?.owner_id && (input.decision === 'approve' || input.decision === 'reject' || input.decision === 'suspend')) {
      const email = await getUserEmail(centre.owner_id);
      await notifyCentreDecision(centre.owner_id, input.decision, {
        email,
        centreName: centre.name ?? undefined,
        reason: input.decision === 'reject' ? (input.reason ?? null) : null,
      });
    }

    await logAudit(`centre.${input.decision}`, 'centre', input.centreId, { reason: input.reason });
    revalidatePath('/admin/centres');
    revalidatePath('/centres');
    return { status };
  });
}

/** Publish or remove a review. Admin only, audited. */
export async function moderateReview(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(moderateReviewSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();
    const status = input.decision === 'publish' ? 'published' : 'removed';

    const { error } = await db.from('reviews').update({ status }).eq('id', input.reviewId);
    if (error) throw error;

    await logAudit(`review.${input.decision}`, 'review', input.reviewId);
    revalidatePath('/admin/reviews');
    return { ok: true as const };
  });
}

/** Mark a review report resolved. Admin only, audited. */
export async function resolveReport(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(resolveReportSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();

    const { error } = await db.from('review_reports').update({ resolved: true }).eq('id', input.reportId);
    if (error) throw error;

    await logAudit('report.resolve', 'review_report', input.reportId);
    revalidatePath('/admin/reviews');
    return { ok: true as const };
  });
}

/** Approve (atomic, transfers ownership via approve_claim) or reject a claim. */
export async function moderateClaim(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(moderateClaimSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();

    if (input.decision === 'approve') {
      const { error } = await db.rpc('approve_claim', { p_claim_id: input.claimId });
      if (error) {
        if (error.message.includes('CLAIM_NOT_PENDING')) throw new ActionError('CONFLICT', 'This claim is no longer pending.');
        if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'Admins only.');
        throw error;
      }
    } else {
      const { error } = await db.from('listing_claims').update({ status: 'rejected' }).eq('id', input.claimId);
      if (error) throw error;
      await logAudit('claim.reject', 'listing_claim', input.claimId);
    }

    revalidatePath('/admin/claims');
    return { ok: true as const };
  });
}

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Admin image upload — uploads via the service-role client instead of the
 * browser's own (RLS-constrained) session.
 *
 * Why: the owner-flow upload path (features/centres/components/image-uploader.tsx)
 * uploads directly from the browser using the signed-in user's session, relying
 * on the Storage bucket's RLS policy (0005_storage.sql) to allow it. That policy
 * re-checks `centres` ownership via a subquery, which is itself subject to
 * `centres`' own RLS — an extra layer that turned out to reject a legitimate
 * admin upload immediately after creating a centre. Rather than guess at Storage
 * RLS/timing internals blind, this route sidesteps that layer entirely: we've
 * already verified requireRole('admin') server-side, so the upload proceeds with
 * the service-role client (bypasses RLS by design — same justification as the
 * Razorpay webhook: a privileged path used only after explicit authorization).
 */
export async function adminUploadCentreImage(formData: FormData): Promise<Result<{ storagePath: string }>> {
  await requireRole('admin');

  const centreId = formData.get('centreId');
  const isCover = formData.get('isCover') === 'true';
  const file = formData.get('file');

  if (typeof centreId !== 'string' || !centreId) return err('VALIDATION', 'Missing centre.');
  if (!(file instanceof File)) return err('VALIDATION', 'No file provided.');
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return err('VALIDATION', `${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.`);
  }
  if (file.size > 5 * 1024 * 1024) return err('VALIDATION', 'Image must be under 5 MB.');

  const { data: centre } = await adminDb.from('centres').select('id').eq('id', centreId).maybeSingle();
  if (!centre) return err('NOT_FOUND', 'Centre not found.');

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${centreId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await adminDb.storage.from('listing-images').upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) return err('INTERNAL', `Upload failed: ${upErr.message}`);

  if (isCover) {
    // Only one row per centre may have is_cover = true (uq_listing_cover) —
    // demote the existing cover to a regular gallery photo first.
    const { error: demoteErr } = await adminDb.from('listing_images').update({ is_cover: false }).eq('centre_id', centreId).eq('is_cover', true);
    if (demoteErr) return err('INTERNAL', demoteErr.message);
  }

  const { error: insErr } = await adminDb.from('listing_images').insert({ centre_id: centreId, storage_path: path, is_cover: isCover });
  if (insErr) return err('INTERNAL', insErr.message);

  if (isCover) {
    const { data: pub } = adminDb.storage.from('listing-images').getPublicUrl(path);
    const { error: coverErr } = await adminDb.from('centres').update({ cover_url: pub.publicUrl }).eq('id', centreId);
    if (coverErr) return err('INTERNAL', coverErr.message);
  }

  revalidatePath('/admin/centres');
  revalidatePath('/centres');
  return ok({ storagePath: path });
}

const adminUpdateCentreSchema = moderateCentreSchema.pick({ centreId: true }).extend({
  name: adminCentreCreateBaseSchema.shape.name.optional(),
  address: adminCentreCreateBaseSchema.shape.address.optional(),
  about: adminCentreCreateBaseSchema.shape.about.optional(),
  isVerified: z.coerce.boolean().optional(),
  womenSafe: z.coerce.boolean().optional(),
});

/**
 * Admin edit — unlike the owner's updateCentre (features/centres/actions.ts),
 * this has no ownership check: an admin can edit any centre, matching what
 * RLS already permits (`auth_role() = 'admin'`) rather than the owner
 * action's stricter same-user-only check.
 */
export async function adminUpdateCentre(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(adminUpdateCentreSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.address !== undefined) patch.address = input.address;
    if (input.about !== undefined) patch.description = input.about || null;
    if (input.isVerified !== undefined) patch.is_verified = input.isVerified;
    if (input.womenSafe !== undefined) patch.women_safe_verified = input.womenSafe;

    const { error } = await db.from('centres').update(patch as never).eq('id', input.centreId);
    if (error) throw error;

    await logAudit('centre.admin_updated', 'centre', input.centreId, patch as Record<string, unknown>);
    revalidatePath('/admin/centres/all');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}

const centreIdSchema = moderateCentreSchema.pick({ centreId: true });

/**
 * "Delete" a centre — soft-delete via the existing archive lifecycle
 * (centres.status = 'archived'), not a real SQL DELETE. A hard delete would
 * cascade into resources/bookings/payment records (real financial history),
 * which the charter's "never run destructive SQL without approval" rule and
 * plain caution both argue against. Archiving already does exactly what
 * "delete" means from the admin's point of view — the listing disappears
 * from the public site (is_published flips false via the existing trigger)
 * — while keeping the underlying records intact and recoverable.
 */
export async function adminDeleteCentre(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(centreIdSchema, raw, async (input) => {
    const adminUser = await requireRole('admin');
    const db = await createClient();
    const { error } = await db
      .from('centres')
      .update({ status: 'archived', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString() })
      .eq('id', input.centreId);
    if (error) throw error;

    await logAudit('centre.admin_deleted', 'centre', input.centreId);
    revalidatePath('/admin/centres/all');
    revalidatePath('/centres');
    return { ok: true as const };
  });
}

/**
 * Change a user's role. Admin-only; enforced twice — requireRole('admin') here
 * AND the SECURITY DEFINER admin_set_user_role() which re-checks and applies
 * guardrails (can't demote the last admin). Audited in the DB function.
 */
export async function setUserRole(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(setUserRoleSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();
    const { error } = await db.rpc('admin_set_user_role', { p_user: input.userId, p_role: input.role });
    if (error) {
      if (error.message.includes('CONFLICT')) throw new ActionError('CONFLICT', 'Cannot demote the last admin.');
      if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'Admin only.');
      throw error;
    }
    revalidatePath('/admin/users');
    return { ok: true as const };
  });
}

export async function setAccountStatus(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(setAccountStatusSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();
    const { error } = await db.rpc('admin_set_account_status', { p_user_id: input.userId, p_status: input.status });
    if (error) {
      if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'Admin only.');
      throw error;
    }
    revalidatePath('/admin/users');
    return { ok: true as const };
  });
}

/**
 * Approve a student/owner's account deletion request. Runs through the
 * admin_approve_account_deletion() RPC (0049_account_deletion_requests.sql)
 * so the role check, the owner-centres-unpublish step, the profile scrub,
 * and the audit log all happen atomically — not as separate client-side
 * calls that could partially fail.
 */
export async function approveAccountDeletion(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(reviewDeletionRequestSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();
    const { error } = await db.rpc('admin_approve_account_deletion', { p_request_id: input.requestId });
    if (error) {
      if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'Admin only.');
      if (error.message.includes('NOT_FOUND')) throw new ActionError('NOT_FOUND', 'Request not found.');
      if (error.message.includes('ALREADY_REVIEWED')) throw new ActionError('VALIDATION', 'This request was already reviewed.');
      throw error;
    }
    revalidatePath('/admin/account-deletions');
    revalidatePath('/admin/users');
    return { ok: true as const };
  });
}

/** Decline a deletion request (e.g. outstanding dues, ongoing dispute) — the account stays exactly as it is. */
export async function rejectAccountDeletion(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(reviewDeletionRequestSchema, raw, async (input) => {
    await requireRole('admin');
    const db = await createClient();
    const { error } = await db.rpc('admin_reject_account_deletion', { p_request_id: input.requestId, p_notes: input.notes || '' });
    if (error) {
      if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'Admin only.');
      throw error;
    }
    revalidatePath('/admin/account-deletions');
    return { ok: true as const };
  });
}
