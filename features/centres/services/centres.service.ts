import 'server-only';
import type { Database, Json } from '@/types/database.types';
import type { CentreSearch, NearbySearch } from '../schema';
import type { CentreListItem, CentrePage, CentreDetail } from '../types';

type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

function cheapestMonthly(pricingList: Json[]): number | null {
  const months = pricingList
    .map((p) => (p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, Json>).month : null))
    .filter((m): m is number => typeof m === 'number');
  return months.length ? Math.min(...months) : null;
}

/**
 * Numbered-pagination search for the /centres page redesign: name/address
 * search, price range, price sort, page N of M. Deliberately NOT keyset —
 * numbered pagination needs "jump to page N" and a total count, which a
 * cursor can't give you. Price is derived from resources.pricing (no plain
 * price column on centres), so filtering/sorting by it happens in JS after
 * one full fetch of the matching rows rather than in SQL — fine at a
 * single-city directory's scale (tens to low hundreds of centres); a catalog
 * growing into the thousands would want a real price column or DB view
 * instead of this approach.
 */
export interface PaginatedCentreSearch {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: 'rating' | 'price_asc' | 'price_desc';
  page: number;
  pageSize: number;
}
export interface PaginatedCentrePage {
  items: CentreListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchCentresPaginated(db: DB, params: PaginatedCentreSearch): Promise<PaginatedCentrePage> {
  let query = db
    .from('centres')
    .select(
      'id, slug, name, area, address, emoji, cover_url, rating, reviews_count, women_safe_verified, is_verified, space_type, resources(pricing, is_active)',
    )
    .eq('is_published', true);

  if (params.q) {
    // Same sanitisation as listCentres's search — strip PostgREST filter
    // control characters so the query can't break or widen the `or()` filter.
    const safe = params.q.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
    if (safe) query = query.or(`name.ilike.*${safe}*,area.ilike.*${safe}*,address.ilike.*${safe}*`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const ids = rows.map((r) => r.id);
  const occByCentre = new Map<string, CentreListItem['occupancy']>();
  if (ids.length) {
    const { data: occ } = await db.from('centre_live_occupancy').select('*').in('centre_id', ids);
    (occ ?? []).forEach((o) => {
      if (!o.centre_id) return;
      occByCentre.set(o.centre_id, {
        seatsFree: o.seats_free ?? 0,
        status: (o.status as 'open' | 'filling' | 'full') ?? 'unknown',
      });
    });
  }

  let items: CentreListItem[] = rows.map((r) => {
    const active = ((r.resources ?? []) as unknown as Array<{ pricing: Json; is_active: boolean }>).filter((x) => x.is_active);
    return {
      id: r.id, slug: r.slug, name: r.name, area: r.area, emoji: r.emoji, cover_url: r.cover_url,
      rating: r.rating, reviews_count: r.reviews_count,
      women_safe_verified: r.women_safe_verified, is_verified: r.is_verified, space_type: r.space_type,
      fromMonthly: cheapestMonthly(active.map((x) => x.pricing)),
      occupancy: occByCentre.get(r.id) ?? null,
    };
  });

  if (params.minPrice !== undefined) items = items.filter((i) => i.fromMonthly !== null && i.fromMonthly >= params.minPrice!);
  if (params.maxPrice !== undefined) items = items.filter((i) => i.fromMonthly !== null && i.fromMonthly <= params.maxPrice!);

  if (params.sort === 'price_asc') {
    items = [...items].sort((a, b) => (a.fromMonthly ?? Infinity) - (b.fromMonthly ?? Infinity));
  } else if (params.sort === 'price_desc') {
    items = [...items].sort((a, b) => (b.fromMonthly ?? -Infinity) - (a.fromMonthly ?? -Infinity));
  } else {
    items = [...items].sort((a, b) => b.rating - a.rating);
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.pageSize;
  const paged = items.slice(start, start + params.pageSize);

  return { items: paged, total, page, pageSize: params.pageSize, totalPages };
}

/**
 * Discovery feed with KEYSET pagination (not OFFSET) so it stays O(1) at any
 * depth over millions of rows. Ordered by (rating desc, id desc); the cursor is
 * the last row's (rating, id). All filters are index-backed.
 */
export async function listCentres(db: DB, params: CentreSearch): Promise<CentrePage> {
  let query = db
    .from('centres')
    .select(
      'id, slug, name, area, emoji, cover_url, rating, reviews_count, women_safe_verified, is_verified, space_type, resources(pricing, is_active)',
    )
    .eq('is_published', true)
    .order('rating', { ascending: false })
    .order('id', { ascending: false })
    .limit(params.limit);

  if (params.area) query = query.eq('area', params.area);
  if (params.spaceType) query = query.eq('space_type', params.spaceType);
  if (params.womenSafe) query = query.eq('women_safe_verified', true);
  if (params.q) {
    // Sanitize: PostgREST `or()` uses commas/parens as syntax and % as wildcard.
    // Strip them from user input so a query can't break or widen the filter.
    const safe = params.q.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
    if (safe) query = query.or(`name.ilike.*${safe}*,area.ilike.*${safe}*`);
  }

  // keyset: rows strictly "after" the cursor in (rating desc, id desc) order
  if (params.cursorRating !== undefined && params.cursorId) {
    query = query.or(
      `rating.lt.${params.cursorRating},and(rating.eq.${params.cursorRating},id.lt.${params.cursorId})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  // enrich with live occupancy in one batched call
  const ids = rows.map((r) => r.id);
  const occByCentre = new Map<string, CentreListItem['occupancy']>();
  if (ids.length) {
    const { data: occ } = await db.from('centre_live_occupancy').select('*').in('centre_id', ids);
    (occ ?? []).forEach((o) => {
      if (!o.centre_id) return;
      occByCentre.set(o.centre_id, {
        seatsFree: o.seats_free ?? 0,
        status: (o.status as 'open' | 'filling' | 'full') ?? 'unknown',
      });
    });
  }

  const items: CentreListItem[] = rows.map((r) => {
    const active = ((r.resources ?? []) as unknown as Array<{ pricing: Json; is_active: boolean }>).filter((x) => x.is_active);
    return {
      id: r.id, slug: r.slug, name: r.name, area: r.area, emoji: r.emoji, cover_url: r.cover_url,
      rating: r.rating, reviews_count: r.reviews_count,
      women_safe_verified: r.women_safe_verified, is_verified: r.is_verified, space_type: r.space_type,
      fromMonthly: cheapestMonthly(active.map((x) => x.pricing)),
      occupancy: occByCentre.get(r.id) ?? null,
    };
  });

  const applied = params.maxMonthly
    ? items.filter((i) => i.fromMonthly === null || i.fromMonthly <= params.maxMonthly!)
    : items;

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === params.limit && last ? { rating: last.rating, id: last.id } : null;

  return { items: applied, nextCursor };
}

export async function getCentreBySlug(db: DB, slug: string): Promise<CentreDetail | null> {
  const { data: centre, error } = await db
    .from('centres')
    .select(
      'id, owner_id, name, slug, space_type, area, address, lat, lng, capacity, cover_url, emoji, rating, reviews_count, is_verified, women_safe_verified, is_published, status, rejection_reason, admin_notes, location_id, updated_at, created_at, reviewed_by, reviewed_at, google_place_id, social, website, phone, description, logo_url, city, state, country, postcode, alt_phone, business_email',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!centre) return null;

  const [{ data: resources }, { data: occ }, { data: images }, { data: amenityRows }] =
    await Promise.all([
      db.from('resources').select('id, centre_id, resource_type, tier, label, unit_count, pricing, is_active').eq('centre_id', centre.id).eq('is_active', true),
      db.from('centre_live_occupancy').select('*').eq('centre_id', centre.id).maybeSingle(),
      db.from('listing_images').select('id, storage_path, alt, is_cover, sort_order, category').eq('centre_id', centre.id).order('sort_order', { ascending: true }),
      db.from('centre_amenities').select('amenities(slug, label, icon)').eq('centre_id', centre.id),
    ]);

  // Similar centres: same area (fallback to same space_type), excluding this one.
  const { data: similarRows } = await db
    .from('centres')
    .select('id, slug, name, area, emoji, cover_url, rating, reviews_count, women_safe_verified, is_verified, space_type')
    .eq('is_published', true)
    .neq('id', centre.id)
    .eq('area', (centre as { area: string | null }).area ?? '')
    .order('rating', { ascending: false })
    .limit(4);

  const social = ((centre as { social?: unknown }).social ?? {}) as Record<string, string>;
  const amenities = ((amenityRows ?? []) as unknown as Array<{ amenities: { slug: string; label: string; icon: string | null } | null }>)
    .map((r) => r.amenities)
    .filter((a): a is { slug: string; label: string; icon: string | null } => a !== null);

  const similar = ((similarRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string, slug: r.slug as string, name: r.name as string, area: r.area as string,
    emoji: r.emoji as string, cover_url: (r.cover_url as string | null) ?? null,
    rating: r.rating as number, reviews_count: r.reviews_count as number,
    women_safe_verified: r.women_safe_verified as boolean, is_verified: r.is_verified as boolean,
    space_type: r.space_type as CentreListItem['space_type'],
    fromMonthly: null, occupancy: null,
  }));

  return {
    ...centre,
    resources: resources ?? [],
    occupancy: occ
      ? { seatsFree: occ.seats_free ?? 0, status: (occ.status as 'open' | 'filling' | 'full') ?? 'unknown' }
      : null,
    gallery: (images ?? []) as CentreDetail['gallery'],
    amenities,
    social,
    similar,
  };
}

export interface PublicReview {
  id: string; rating: number; body: string | null; is_verified: boolean; created_at: string;
  author: { full_name: string | null } | null;
}

/** Published reviews for a centre, newest first. */
export async function getCentreReviews(db: DB, centreId: string, limit = 20): Promise<PublicReview[]> {
  const { data, error } = await db
    .from('reviews')
    .select('id, rating, body, is_verified, created_at, author:author_id(full_name)')
    .eq('centre_id', centreId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PublicReview[];
}

/**
 * Nearby search — distance-ordered results within a radius, via the
 * search_centres_nearby RPC (earthdistance + GiST index, see migration 0016).
 * Returns each centre with `distanceKm` so the UI can show "X km away".
 */
export async function listCentresNearby(
  db: DB,
  params: NearbySearch,
): Promise<Array<CentreListItem & { distanceKm: number }>> {
  // Args typed loosely: generated function-arg types can be imprecise for
  // optional/typed params; the RPC itself validates. Values are Zod-checked upstream.
  const { data, error } = await db.rpc('search_centres_nearby', {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_km: params.radiusKm,
    p_space_type: params.spaceType ?? undefined,
    p_women_safe: params.womenSafe ?? undefined,
    p_limit: params.limit,
  } as never);
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    area: r.area as string,
    emoji: r.emoji as string,
    rating: r.rating as number,
    reviews_count: r.reviews_count as number,
    women_safe_verified: r.women_safe_verified as boolean,
    is_verified: r.is_verified as boolean,
    space_type: r.space_type as CentreListItem['space_type'],
    cover_url: (r.cover_url as string | null) ?? null,
    fromMonthly: null,
    occupancy: null,
    distanceKm: Math.round(((r.distance_m as number) / 1000) * 10) / 10,
  }));
}
