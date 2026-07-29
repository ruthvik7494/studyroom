'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Mapbox-powered location search for centre onboarding (search-as-you-type,
 * via the Mapbox Geocoding API — plain REST, no SDK needed for this piece).
 *
 * On selection it emits the fields the onboarding form + DB expect: name,
 * address, lat, lng, and googlePlaceId (Mapbox's feature id — the DB column
 * is generically named for "an external place reference", so it didn't need
 * a migration to switch providers). The owner can still edit any field
 * afterwards — this just pre-fills so they don't type the address and
 * coordinates by hand.
 *
 * Requires NEXT_PUBLIC_MAPBOX_TOKEN. If absent, degrades to a plain text
 * input so the form still works — geo is then entered manually.
 */

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
};

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function PlacesPicker({
  onSelect,
  defaultValue = '',
}: {
  onSelect: (place: PlaceResult) => void;
  defaultValue?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || query.trim().length < 3) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=in&limit=5&types=poi,address,place`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.features ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (f: MapboxFeature) => {
    onSelect({
      name: f.text,
      address: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
      googlePlaceId: f.id,
    });
    setQuery(f.place_name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      <label htmlFor="places-input" className="block text-sm font-medium">
        Search Your Location
      </label>
      <input
        id="places-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={MAPBOX_TOKEN ? 'Search by business name…' : 'Type your address'}
        autoComplete="off"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border bg-background shadow-lg">
          {suggestions.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => pick(f)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <span className="font-medium">{f.text}</span>
                <span className="block truncate text-xs text-muted-foreground">{f.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {!MAPBOX_TOKEN
          ? 'Address search is unavailable right now — enter your address and location manually.'
          : loading
            ? 'Searching…'
            : 'Pick your place to auto-fill the address and map location.'}
      </p>
    </div>
  );
}
