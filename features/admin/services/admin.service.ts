import 'server-only';
import type { Database } from '@/types/database.types';

type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export interface AdminStats {
  pendingCentres: number;
  openReports: number;
  pendingClaims: number;
  newEnquiries: number;
  pendingDeletions: number;
}

/** Counts for the dashboard overview. Uses head+count (no rows fetched). */
export async function getAdminStats(db: DB): Promise<AdminStats> {
  const [pendingCentres, openReports, pendingClaims, newEnquiries, pendingDeletions] = await Promise.all([
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    db.from('review_reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
    db.from('listing_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    db.from('account_deletion_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    pendingCentres: pendingCentres.count ?? 0,
    openReports: openReports.count ?? 0,
    pendingClaims: pendingClaims.count ?? 0,
    newEnquiries: newEnquiries.count ?? 0,
    pendingDeletions: pendingDeletions.count ?? 0,
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

export interface PendingDeletionRequest {
  id: string;
  reason: string | null;
  requested_at: string;
  user: { full_name: string | null; role: Database['public']['Enums']['user_role'] } | null;
}

/** Account deletion requests awaiting admin review, oldest first. */
export async function getPendingDeletionRequests(db: DB): Promise<PendingDeletionRequest[]> {
  const { data, error } = await db
    .from('account_deletion_requests')
    .select('id, reason, requested_at, user:user_id(full_name, role)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as PendingDeletionRequest[];
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

export interface AdminCentreSearch { q?: string; page: number; pageSize: number; showArchived?: boolean; status?: 'pending_review' }
export interface AdminCentrePage {
  items: AdminCentreListItem[]; total: number; page: number; pageSize: number; totalPages: number;
}

/**
 * All centres, name-searchable, numbered-paginated — the "All Centres" admin
 * view. By default excludes archived (soft-deleted) centres — "Delete" sets
 * status to 'archived' rather than removing the row, and without this filter
 * a deleted listing just sat in the same list with a different badge, which
 * looked exactly like delete wasn't working. Pass showArchived to see (and
 * restore) what's been deleted instead.
 */
export async function getAllCentres(db: DB, params: AdminCentreSearch): Promise<AdminCentrePage> {
  let query = db
    .from('centres')
    .select('id, name, slug, area, address, status, created_at, owner:owner_id(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  query = params.status ? query.eq('status', params.status) : params.showArchived ? query.eq('status', 'archived') : query.neq('status', 'archived');

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

export interface AdminOverview {
  users: { total: number; students: number; owners: number; admins: number; suspended: number; newLast30d: number };
  centres: { total: number; draft: number; pendingReview: number; approved: number; rejected: number; archived: number; published: number };
  bookings: { total: number; pending: number; confirmed: number; checkedIn: number; completed: number; cancelled: number; expired: number };
  payments: { paid: number; unpaid: number; failed: number; refundPending: number; refunded: number };
  revenue: { totalLifetime: number; last30d: number; last7d: number };
  pendingRefunds: number;
}

/**
 * Comprehensive platform overview — separate from getAdminStats (which stays
 * exactly as it was, still backing the same 4 pending-action cards) so
 * nothing that already depends on it is affected. This adds real user/owner/
 * centre/booking/payment/revenue breakdowns for a genuine dashboard.
 */
export async function getAdminOverview(db: DB): Promise<AdminOverview> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    totalUsers, students, owners, admins, suspended, newUsers,
    totalCentres, draftC, pendingC, approvedC, rejectedC, archivedC, publishedC,
    totalBookings, pendingB, confirmedB, checkedInB, completedB, cancelledB, expiredB,
    paidP, unpaidP, failedP, refundPendingP, refundedP,
    revenueAll, revenue30, revenue7,
    pendingRefunds,
  ] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('account_status', 'suspended'),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),

    db.from('centres').select('id', { count: 'exact', head: true }),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('is_published', true),

    db.from('bookings').select('id', { count: 'exact', head: true }),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'expired'),

    db.from('bookings').select('id', { count: 'exact', head: true }).eq('payment', 'paid'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('payment', 'unpaid'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('payment', 'failed'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('payment', 'refund_pending'),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('payment', ['refunded', 'partially_refunded']),

    db.from('bookings').select('amount').in('payment', ['paid', 'partially_refunded']),
    db.from('bookings').select('amount').in('payment', ['paid', 'partially_refunded']).gte('created_at', thirtyDaysAgo),
    db.from('bookings').select('amount').in('payment', ['paid', 'partially_refunded']).gte('created_at', sevenDaysAgo),

    db.from('refunds').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const sumAmount = (rows: { amount: number }[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return {
    users: {
      total: totalUsers.count ?? 0, students: students.count ?? 0, owners: owners.count ?? 0,
      admins: admins.count ?? 0, suspended: suspended.count ?? 0, newLast30d: newUsers.count ?? 0,
    },
    centres: {
      total: totalCentres.count ?? 0, draft: draftC.count ?? 0, pendingReview: pendingC.count ?? 0,
      approved: approvedC.count ?? 0, rejected: rejectedC.count ?? 0, archived: archivedC.count ?? 0,
      published: publishedC.count ?? 0,
    },
    bookings: {
      total: totalBookings.count ?? 0, pending: pendingB.count ?? 0, confirmed: confirmedB.count ?? 0,
      checkedIn: checkedInB.count ?? 0, completed: completedB.count ?? 0, cancelled: cancelledB.count ?? 0,
      expired: expiredB.count ?? 0,
    },
    payments: {
      paid: paidP.count ?? 0, unpaid: unpaidP.count ?? 0, failed: failedP.count ?? 0,
      refundPending: refundPendingP.count ?? 0, refunded: refundedP.count ?? 0,
    },
    revenue: {
      totalLifetime: sumAmount(revenueAll.data), last30d: sumAmount(revenue30.data), last7d: sumAmount(revenue7.data),
    },
    pendingRefunds: pendingRefunds.count ?? 0,
  };
}

/** Real day-by-day revenue for the last `days` days — used for the trend
 * sparkline on the dashboard. Each entry is a real sum, not synthetic data. */
export async function getRevenueTrend(db: DB, days = 14): Promise<number[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const { data } = await db.from('bookings')
    .select('amount, created_at')
    .in('payment', ['paid', 'partially_refunded'])
    .gte('created_at', since.toISOString());

  const buckets = new Array(days).fill(0) as number[];
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  (data ?? []).forEach((r) => {
    const dayIndex = days - 1 - Math.floor((startOfToday.getTime() - new Date(r.created_at).setHours(0, 0, 0, 0)) / 86_400_000);
    if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] = (buckets[dayIndex] ?? 0) + Number(r.amount);
  });
  return buckets;
}

/** Recent cross-platform activity feed for the dashboard — a small, readable
 * slice of the real audit log, not a separate fabricated activity table. */
export async function getRecentActivity(db: DB, limit = 6): Promise<{ id: number; action: string; created_at: string }[]> {
  const { data } = await db.from('audit_logs').select('id, action, created_at').order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
}
