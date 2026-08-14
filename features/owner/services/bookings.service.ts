import 'server-only';
import type { Database } from '@/types/database.types';
import { admin as adminDb } from '@/lib/supabase/admin';

type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export interface OwnerBookingMetrics {
  today: number; upcoming: number; revenue: number;
  checkIns: number; noShows: number; waitlist: number; occupancyPct: number;
  passBreakdown: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
    quarterly: number;
    halfYearly: number;
    yearly: number;
  };
}

/** All metrics scoped to the given owner's centres. */
export async function getOwnerMetrics(db: DB, ownerId: string): Promise<OwnerBookingMetrics> {
  // Which centres does this owner have?
  const { data: centres } = await db.from('centres').select('id, capacity').eq('owner_id', ownerId);
  const centreIds = (centres ?? []).map((c) => c.id);
  if (centreIds.length === 0) {
    return {
      today: 0, upcoming: 0, revenue: 0, checkIns: 0, noShows: 0, waitlist: 0, occupancyPct: 0,
      passBreakdown: { hourly: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 },
    };
  }
  const totalCapacity = (centres ?? []).reduce((s, c) => s + (c.capacity ?? 0), 0);

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [today, upcoming, checkIns, noShows, activeNow, paid, resourceIds, allActiveBookings] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).in('centre_id', centreIds).in('status', ['confirmed', 'checked_in', 'completed']).eq('payment', 'paid').gte('starts_at', startToday).lt('starts_at', endToday),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('centre_id', centreIds).gte('starts_at', endToday).eq('status', 'confirmed').eq('payment', 'paid'),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('centre_id', centreIds).eq('status', 'checked_in'),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('centre_id', centreIds).eq('status', 'no_show'),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('centre_id', centreIds).in('status', ['confirmed', 'checked_in']).lte('starts_at', endToday).gte('ends_at', startToday),
    db.from('bookings').select('amount').in('centre_id', centreIds).in('payment', ['paid', 'partially_refunded']).gte('created_at', startMonth),
    db.from('resources').select('id').in('centre_id', centreIds),
    db.from('bookings').select('period').in('centre_id', centreIds).in('status', ['confirmed', 'checked_in']).eq('payment', 'paid'),
  ]);

  const revenue = (paid.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // Pass breakdown calculations
  const passBreakdown = { hourly: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, halfYearly: 0, yearly: 0 };
  (allActiveBookings.data ?? []).forEach((b) => {
    const p = (b.period || '').toLowerCase();
    if (p === 'hour') passBreakdown.hourly++;
    else if (p === 'day') passBreakdown.daily++;
    else if (p === 'week' || p === 'fortnight') passBreakdown.weekly++;
    else if (p === 'month') passBreakdown.monthly++;
    else if (p === 'quarter') passBreakdown.quarterly++;
    else if (p === 'half_year') passBreakdown.halfYearly++;
    else if (p === 'year') passBreakdown.yearly++;
  });

  // Waitlist across this owner's resources.
  const rIds = (resourceIds.data ?? []).map((r) => r.id);
  let waitlist = 0;
  if (rIds.length) {
    const { count } = await db.from('waitlist_entries').select('id', { count: 'exact', head: true }).in('resource_id', rIds).eq('status', 'waiting');
    waitlist = count ?? 0;
  }

  const occupancyPct = totalCapacity > 0 ? Math.min(100, Math.round(((activeNow.count ?? 0) / totalCapacity) * 100)) : 0;

  return {
    today: today.count ?? 0, upcoming: upcoming.count ?? 0, revenue,
    checkIns: checkIns.count ?? 0, noShows: noShows.count ?? 0, waitlist, occupancyPct,
    passBreakdown,
  };
}

export interface OwnerBookingRow {
  id: string; status: string; payment: string; amount: number; period: string; starts_at: string;
  centre: { name: string } | null; student: { full_name: string | null } | null;
}

/** Today's + upcoming bookings for the owner's centres. */
export async function getOwnerBookings(
  db: DB, ownerId: string, scope: 'today' | 'upcoming' | 'all', limit = 50,
): Promise<OwnerBookingRow[]> {
  const { data: centres } = await db.from('centres').select('id').eq('owner_id', ownerId);
  const centreIds = (centres ?? []).map((c) => c.id);
  if (centreIds.length === 0) return [];

  // Read via the service-role client, not the owner's own session: RLS on
  // `profiles` only lets a user read their OWN row (or an admin read any
  // row) — an owner has no policy letting them read a *student's* profile,
  // so this join to student:user_id(full_name) silently comes back null
  // under the owner's session, and the UI fell back to "Guest". The centre
  // scoping above (owner_id = ownerId, verified server-side) is what makes
  // this safe: an owner only ever sees bookings at centres they actually
  // own, same rows they're already entitled to see.
  let query = adminDb
    .from('bookings')
    .select('id, status, payment, amount, period, starts_at, centre:centre_id(name), student:user_id(full_name)')
    .in('centre_id', centreIds)
    .order('starts_at', { ascending: scope !== 'all' });

  const now = new Date();
  if (scope === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    query = query.gte('starts_at', start).lt('starts_at', end);
  } else if (scope === 'upcoming') {
    query = query.gte('starts_at', now.toISOString());
  }

  const { data } = await query.limit(limit);
  return (data ?? []) as unknown as OwnerBookingRow[];
}

export interface OwnerCustomer {
  userId: string;
  name: string | null;
  bookings: number;
  totalSpend: number;
  lastVisit: string | null;
}

/**
 * Customers of an owner's centres: one row per unique booker, with lifetime
 * booking count, total paid spend, and last visit. Ordered by spend desc.
 */
export async function getOwnerCustomers(db: DB, ownerId: string, limit = 100): Promise<OwnerCustomer[]> {
  const { data: centres } = await db.from('centres').select('id').eq('owner_id', ownerId);
  const centreIds = (centres ?? []).map((c) => c.id);
  if (centreIds.length === 0) return [];

  // Same reasoning as getOwnerBookings above: the join to the student's
  // profile needs the service-role client, since an owner's own session has
  // no RLS grant to read another user's profile row.
  const { data: rows } = await adminDb
    .from('bookings')
    .select('user_id, amount, payment, starts_at, student:user_id(full_name)')
    .in('centre_id', centreIds)
    .order('starts_at', { ascending: false });

  const map = new Map<string, OwnerCustomer>();
  for (const r of (rows ?? []) as unknown as Array<{
    user_id: string; amount: number | null; payment: string; starts_at: string;
    student: { full_name: string | null } | null;
  }>) {
    const cur = map.get(r.user_id) ?? { userId: r.user_id, name: r.student?.full_name ?? null, bookings: 0, totalSpend: 0, lastVisit: null };
    cur.bookings += 1;
    if (r.payment === 'paid' || r.payment === 'partially_refunded') cur.totalSpend += Number(r.amount ?? 0);
    if (!cur.lastVisit || r.starts_at > cur.lastVisit) cur.lastVisit = r.starts_at;
    map.set(r.user_id, cur);
  }
  return [...map.values()].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, limit);
}

export interface CalendarBooking {
  id: string;
  date: string;       // YYYY-MM-DD
  centreName: string;
  status: string;
  period: string;
}

/**
 * Bookings for an owner's centres within a date window, for the calendar view.
 * Returns lightweight rows the calendar groups by date.
 */
export async function getOwnerCalendar(db: DB, ownerId: string, fromISO: string, toISO: string): Promise<CalendarBooking[]> {
  const { data: centres } = await db.from('centres').select('id').eq('owner_id', ownerId);
  const centreIds = (centres ?? []).map((c) => c.id);
  if (centreIds.length === 0) return [];

  const { data: rows } = await db
    .from('bookings')
    .select('id, starts_at, status, period, centre:centre_id(name)')
    .in('centre_id', centreIds)
    .gte('starts_at', fromISO)
    .lte('starts_at', toISO)
    .order('starts_at', { ascending: true });

  return ((rows ?? []) as unknown as Array<{ id: string; starts_at: string; status: string; period: string; centre: { name: string } | null }>).map((r) => ({
    id: r.id,
    date: r.starts_at.slice(0, 10),
    centreName: r.centre?.name ?? 'Centre',
    status: r.status,
    period: r.period,
  }));
}
