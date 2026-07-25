import 'server-only';
import type { Database } from '@/types/database.types';

type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export interface AdminStats {
  pendingCentres: number;
  openReports: number;
  pendingClaims: number;
  newEnquiries: number;
}

/** Counts for the dashboard overview. Uses head+count (no rows fetched). */
export async function getAdminStats(db: DB): Promise<AdminStats> {
  const [pendingCentres, openReports, pendingClaims, newEnquiries] = await Promise.all([
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    db.from('review_reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
    db.from('listing_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ]);
  return {
    pendingCentres: pendingCentres.count ?? 0,
    openReports: openReports.count ?? 0,
    pendingClaims: pendingClaims.count ?? 0,
    newEnquiries: newEnquiries.count ?? 0,
  };
}

export interface PendingCentre {
  id: string; name: string; slug: string; area: string | null; emoji: string;
  space_type: Database['public']['Enums']['space_type']; created_at: string;
  owner: { full_name: string | null } | null;
}

/** Listings awaiting review, oldest first (FIFO moderation queue). */
export async function getPendingCentres(db: DB): Promise<PendingCentre[]> {
  const { data, error } = await db
    .from('centres')
    .select('id, name, slug, area, emoji, space_type, created_at, owner:owner_id(full_name)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as PendingCentre[];
}

export interface ReportedReview {
  reportId: string; reason: string; created_at: string;
  review: { id: string; rating: number; body: string | null; status: Database['public']['Enums']['review_status'] } | null;
}

/** Open review reports for moderation. */
export async function getOpenReports(db: DB): Promise<ReportedReview[]> {
  const { data, error } = await db
    .from('review_reports')
    .select('reportId:id, reason, created_at, review:review_id(id, rating, body, status)')
    .eq('resolved', false)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as ReportedReview[];
}

export interface AuditEntry {
  id: number; action: string; entity_type: string; entity_id: string | null;
  created_at: string; actor: { full_name: string | null } | null;
}

/** Recent audit trail (admin-only via RLS). */
export async function getAuditLog(db: DB, limit = 100): Promise<AuditEntry[]> {
  const { data, error } = await db
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, created_at, actor:actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AuditEntry[];
}

export interface PendingClaim {
  id: string; evidence: string | null; created_at: string;
  centre: { id: string; name: string; slug: string; owner_id: string | null } | null;
  claimant: { full_name: string | null } | null;
}

/** Pending listing-ownership claims, oldest first. */
export async function getPendingClaims(db: DB): Promise<PendingClaim[]> {
  const { data, error } = await db
    .from('listing_claims')
    .select('id, evidence, created_at, centre:centre_id(id, name, slug, owner_id), claimant:claimant_id(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as PendingClaim[];
}

export interface AdminCentreListItem {
  id: string; name: string; slug: string; area: string | null; address: string | null;
  status: Database['public']['Enums']['listing_status']; created_at: string;
  owner: { full_name: string | null } | null;
}

export interface AdminCentreSearch { q?: string; page: number; pageSize: number }
export interface AdminCentrePage {
  items: AdminCentreListItem[]; total: number; page: number; pageSize: number; totalPages: number;
}

/** All centres regardless of status, name-searchable, numbered-paginated — the "All Centres" admin view. */
export async function getAllCentres(db: DB, params: AdminCentreSearch): Promise<AdminCentrePage> {
  let query = db
    .from('centres')
    .select('id, name, slug, area, address, status, created_at, owner:owner_id(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.q) {
    // Same PostgREST filter-character sanitisation used by the public search.
    const safe = params.q.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
    if (safe) query = query.ilike('name', `%${safe}%`);
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  return {
    items: (data ?? []) as unknown as AdminCentreListItem[],
    total, page: params.page, pageSize: params.pageSize, totalPages,
  };
}

export interface AdminCentreEditDetail {
  id: string; name: string; address: string | null; description: string | null;
  cover_url: string | null; is_verified: boolean; women_safe_verified: boolean;
  gallery: { id: string; storage_path: string; is_cover: boolean }[];
}

/** Single centre for the admin edit page — any status, any owner. */
export async function getCentreForAdminEdit(db: DB, centreId: string): Promise<AdminCentreEditDetail | null> {
  const { data: centre, error } = await db
    .from('centres')
    .select('id, name, address, description, cover_url, is_verified, women_safe_verified')
    .eq('id', centreId)
    .maybeSingle();
  if (error) throw error;
  if (!centre) return null;

  const { data: images } = await db
    .from('listing_images')
    .select('id, storage_path, is_cover')
    .eq('centre_id', centreId)
    .order('sort_order', { ascending: true });

  return { ...centre, gallery: images ?? [] };
}
