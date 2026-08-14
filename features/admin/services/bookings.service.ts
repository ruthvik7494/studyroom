import 'server-only';
import type { Database } from '@/types/database.types';
import { getUserEmail } from '@/lib/email';

type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export const BOOKING_STATUSES = [
  'pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'expired', 'refunded',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface BookingMetrics {
  today: number; week: number; month: number;
  revenue: number; refunds: number; noShows: number; waitlist: number;
}

/** Dashboard metrics — all head+count / narrow selects, no wide row fetches. */
export async function getBookingMetrics(db: DB): Promise<BookingMetrics> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startWeek = new Date(now.getTime() - 6 * 86_400_000).toISOString();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Only count confirmed/paid bookings towards metrics (filtering out unconfirmed, pending, expired, or cancelled reservations)
  const [today, week, month, noShows, waitlist, paid, refundRows] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'checked_in', 'completed']).eq('payment', 'paid').gte('created_at', startToday),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'checked_in', 'completed']).eq('payment', 'paid').gte('created_at', startWeek),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'checked_in', 'completed']).eq('payment', 'paid').gte('created_at', startMonth),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'no_show'),
    db.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    db.from('bookings').select('amount').in('payment', ['paid', 'partially_refunded']).gte('created_at', startMonth),
    db.from('refunds').select('amount').eq('status', 'succeeded').gte('created_at', startMonth),
  ]);

  const revenue = (paid.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const refunds = (refundRows.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return {
    today: today.count ?? 0, week: week.count ?? 0, month: month.count ?? 0,
    revenue, refunds, noShows: noShows.count ?? 0, waitlist: waitlist.count ?? 0,
  };
}

export interface AdminBookingRow {
  id: string; status: string; payment: string; amount: number;
  period: string; starts_at: string; created_at: string;
  centre: { name: string; slug: string } | null;
  student: { full_name: string | null } | null;
}

export interface BookingSearchParams {
  q?: string; status?: BookingStatus; sort?: 'created' | 'starts' | 'payment' | 'centre' | 'student';
  limit?: number; offset?: number;
}

/** Search/filter/sort bookings for the admin table. */
export async function searchBookings(db: DB, p: BookingSearchParams): Promise<{ rows: AdminBookingRow[]; total: number }> {
  const limit = Math.min(p.limit ?? 25, 100);
  const offset = p.offset ?? 0;

  let query = db
    .from('bookings')
    .select(
      'id, status, payment, amount, period, starts_at, created_at, centre:centre_id(name, slug), student:user_id(full_name)',
      { count: 'exact' },
    );

  if (p.status) query = query.eq('status', p.status);

  // Sort mapping (default: newest first).
  const dir = { ascending: false } as const;
  switch (p.sort) {
    case 'starts': query = query.order('starts_at', dir); break;
    case 'payment': query = query.order('payment', dir); break;
    default: query = query.order('created_at', dir);
  }

  const { data, count } = await query.range(offset, offset + limit - 1);
  let rows = (data ?? []) as unknown as AdminBookingRow[];

  // Text filter on centre/student done in-memory over the page (small admin pages);
  // avoids unsafe interpolation into embedded-column filters.
  if (p.q) {
    const needle = p.q.toLowerCase();
    rows = rows.filter(
      (r) => r.centre?.name?.toLowerCase().includes(needle) || r.student?.full_name?.toLowerCase().includes(needle),
    );
  }

  return { rows, total: count ?? 0 };
}

export interface AdminBookingDetail extends AdminBookingRow {
  user_id: string; centre_id: string;
  cancel_reason: string | null; cancelled_at: string | null;
  checked_in_at: string | null; completed_at: string | null;
  razorpay_order_id: string | null; razorpay_payment_id: string | null;
  refunds: { id: string; amount: number; status: string; created_at: string; reason: string | null }[];
  audit: { id: number; action: string; created_at: string; metadata: unknown }[];
}

/** Booking detail: full record + refund history + audit timeline. */
export async function getBookingDetail(db: DB, id: string): Promise<AdminBookingDetail | null> {
  const { data: bk } = await db
    .from('bookings')
    .select(
      'id, user_id, centre_id, status, payment, amount, period, starts_at, created_at, cancel_reason, cancelled_at, checked_in_at, completed_at, razorpay_order_id, razorpay_payment_id, centre:centre_id(name, slug), student:user_id(full_name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!bk) return null;

  const [refunds, audit] = await Promise.all([
    db.from('refunds').select('id, amount, status, created_at, reason').eq('booking_id', id).order('created_at', { ascending: false }),
    db.from('audit_logs').select('id, action, created_at, metadata').eq('entity_type', 'booking').eq('entity_id', id).order('created_at', { ascending: false }),
  ]);

  return {
    ...(bk as unknown as AdminBookingRow),
    user_id: (bk as { user_id: string }).user_id,
    centre_id: (bk as { centre_id: string }).centre_id,
    cancel_reason: (bk as { cancel_reason: string | null }).cancel_reason,
    cancelled_at: (bk as { cancelled_at: string | null }).cancelled_at,
    checked_in_at: (bk as { checked_in_at: string | null }).checked_in_at,
    completed_at: (bk as { completed_at: string | null }).completed_at,
    razorpay_order_id: (bk as { razorpay_order_id: string | null }).razorpay_order_id,
    razorpay_payment_id: (bk as { razorpay_payment_id: string | null }).razorpay_payment_id,
    refunds: (refunds.data ?? []) as AdminBookingDetail['refunds'],
    audit: (audit.data ?? []) as AdminBookingDetail['audit'],
  };
}

export interface StudentSummary {
  fullName: string | null; email: string | null; phone: string | null;
  totalBookings: number; cancellations: number; noShows: number; reviews: number;
}

/** Student profile summary for the booking detail page. */
export async function getStudentSummary(db: DB, userId: string): Promise<StudentSummary> {
  const [profile, total, cancels, noShows, reviews, email] = await Promise.all([
    db.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle(),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'cancelled'),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'no_show'),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('author_id', userId),
    // Email lives in auth.users, not profiles — reachable only via the admin API.
    getUserEmail(userId).catch(() => null),
  ]);
  return {
    fullName: profile.data?.full_name ?? null,
    email,
    phone: profile.data?.phone ?? null,
    totalBookings: total.count ?? 0, cancellations: cancels.count ?? 0,
    noShows: noShows.count ?? 0, reviews: reviews.count ?? 0,
  };
}

export interface CentreSummary {
  name: string; capacity: number; activeBookings: number; seatsFree: number;
  occupancyPct: number; waitlistCount: number; totalBookings: number;
}

/** Centre summary for the booking detail page. */
export async function getCentreSummary(db: DB, centreId: string): Promise<CentreSummary | null> {
  const { data: centre } = await db.from('centres').select('name, capacity').eq('id', centreId).maybeSingle();
  if (!centre) return null;

  const { data: resources } = await db.from('resources').select('id').eq('centre_id', centreId);
  const rIds = (resources ?? []).map((r) => r.id);

  const [active, total, waitlist] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('centre_id', centreId).in('status', ['pending', 'confirmed', 'checked_in']),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('centre_id', centreId),
    rIds.length ? db.from('waitlist_entries').select('id', { count: 'exact', head: true }).in('resource_id', rIds).eq('status', 'waiting') : Promise.resolve({ count: 0 }),
  ]);

  const capacity = centre.capacity ?? 0;
  const activeBookings = active.count ?? 0;
  return {
    name: centre.name, capacity, activeBookings,
    seatsFree: Math.max(0, capacity - activeBookings),
    occupancyPct: capacity > 0 ? Math.min(100, Math.round((activeBookings / capacity) * 100)) : 0,
    waitlistCount: waitlist.count ?? 0, totalBookings: total.count ?? 0,
  };
}
