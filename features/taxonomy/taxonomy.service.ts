import 'server-only';
import type { Database } from '@/types/database.types';
import type { CentreListItem } from '../centres/types';

type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export interface Taxonomy { slug: string; name: string; description?: string | null }

export async function getCategoryBySlug(db: DB, slug: string): Promise<Taxonomy | null> {
  const { data } = await db.from('categories').select('slug, name, description').eq('slug', slug).maybeSingle();
  return data ?? null;
}

export async function getLocationBySlug(db: DB, slug: string): Promise<Taxonomy | null> {
  const { data } = await db.from('locations').select('slug, name').eq('slug', slug).maybeSingle();
  return data ?? null;
}

export async function listAllCategories(db: DB): Promise<Taxonomy[]> {
  const { data } = await db.from('categories').select('slug, name, description').order('sort_order');
  return data ?? [];
}

export async function listAllLocations(db: DB): Promise<Taxonomy[]> {
  const { data } = await db.from('locations').select('slug, name').order('name');
  return data ?? [];
}

/**
 * Real "popular search" suggestions — derived from the areas actual
 * published centres are in, not the static seeded `locations` table (which
 * always shows the same 3 sample places regardless of what's really
 * listed). Ranked by how many published centres are in each area, capped
 * at `limit`.
 */
export async function getPopularAreas(db: DB, limit = 3): Promise<{ name: string }[]> {
  const { data } = await db.from('centres').select('area').eq('is_published', true).not('area', 'is', null);
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => { if (r.area) counts.set(r.area, (counts.get(r.area) ?? 0) + 1); });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => ({ name }));
}

/** Approved centres in a category (via listing_categories join), for a landing page. */
export async function listCentresByCategory(db: DB, categorySlug: string, limit = 24): Promise<CentreListItem[]> {
  const { data: cat } = await db.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
  if (!cat) return [];

  const { data, error } = await db
    .from('listing_categories')
    .select('centres!inner(id, slug, name, area, emoji, cover_url, rating, reviews_count, women_safe_verified, is_verified, space_type, status)')
    .eq('category_id', cat.id)
    .limit(limit);
  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as { centres: unknown }).centres as CentreListItem & { status: string })
    .filter((c) => c.status === 'approved')
    .map(({ status: _s, ...c }) => ({ ...c, fromMonthly: null, occupancy: null }));
}

/** Approved centres in a location, for a landing page. */
export async function listCentresByLocation(db: DB, locationSlug: string, limit = 24): Promise<CentreListItem[]> {
  const { data: loc } = await db.from('locations').select('id').eq('slug', locationSlug).maybeSingle();
  if (!loc) return [];

  const { data, error } = await db
    .from('centres')
    .select('id, slug, name, area, emoji, cover_url, rating, reviews_count, women_safe_verified, is_verified, space_type')
    .eq('location_id', loc.id)
    .eq('status', 'approved')
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((c) => ({ ...c, fromMonthly: null, occupancy: null }));
}
