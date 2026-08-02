type DB = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>;

export interface ServiceArea {
  /** The most common city among published centres, or null if none is set
   * anywhere (or there are no published centres at all). Never a hardcoded
   * fallback — callers must handle null with a generic phrase or empty state. */
  city: string | null;
  /** The most common state among published centres, or null. */
  state: string | null;
  /** Average coordinates across published centres that have lat/lng set,
   * or null if none do — used for map display instead of a fixed pin. */
  coords: { lat: number; lng: number } | null;
  /** Whether any published centres exist at all. */
  hasCentres: boolean;
}

/**
 * Derives the real "service area" (city, state, representative map
 * coordinates) from the database instead of a hardcoded sample location.
 * Returns nulls for anything that can't be determined — callers show a
 * generic phrase ("near you") or an empty state, never a sample value.
 */
export async function getServiceArea(db: DB): Promise<ServiceArea> {
  const { data: rows, count } = await db
    .from('centres')
    .select('city, state, lat, lng', { count: 'exact' })
    .eq('is_published', true);
  const hasCentres = (count ?? 0) > 0;
  if (!hasCentres) return { city: null, state: null, coords: null, hasCentres: false };

  const mostCommon = (values: (string | null)[]): string | null => {
    const counts = new Map<string, number>();
    values.forEach((v) => { if (v) counts.set(v, (counts.get(v) ?? 0) + 1); });
    if (counts.size === 0) return null;
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  };

  let city = mostCommon((rows ?? []).map((r) => r.city));
  if (!city) {
    // No centre has a city set — fall back to the most common area/locality.
    const { data: areaRows } = await db.from('centres').select('area').eq('is_published', true).not('area', 'is', null);
    city = mostCommon((areaRows ?? []).map((r) => r.area));
  }
  const state = mostCommon((rows ?? []).map((r) => r.state));

  const withCoords = (rows ?? []).filter((r) => r.lat !== null && r.lng !== null) as { lat: number; lng: number }[];
  const coords = withCoords.length > 0
    ? { lat: withCoords.reduce((s, r) => s + r.lat, 0) / withCoords.length, lng: withCoords.reduce((s, r) => s + r.lng, 0) / withCoords.length }
    : null;

  return { city, state, coords, hasCentres: true };
}
