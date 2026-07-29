'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Mapbox GL map for the search results view. Renders a pin per centre and, as
 * the user pans/zooms, re-queries GET /api/centres/nearby (backed by the
 * search_centres_nearby RPC) for the new map centre + radius.
 *
 * Requires NEXT_PUBLIC_MAPBOX_TOKEN. Without it, the component renders a
 * short message instead of a map — the list-based search still works on its
 * own. Mapbox GL JS is loaded from Mapbox's CDN at runtime (script + CSS),
 * the same on-demand pattern the old Google Maps version used — no npm
 * package needed, so this doesn't add anything to the JS bundle unless the
 * map is actually shown.
 */

export type MapCentre = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  distanceKm?: number;
};

// Minimal shape of the Mapbox GL JS pieces this component uses.
interface MGLMap {
  on: (event: string, cb: () => void) => void;
  getCenter: () => { lat: number; lng: number };
  getBounds: () => { getNorthEast: () => { lat: number; lng: number } };
  remove: () => void;
}
interface MGLMarker {
  setLngLat: (p: [number, number]) => MGLMarker;
  addTo: (m: MGLMap) => MGLMarker;
  remove: () => void;
  getElement: () => HTMLElement;
}
interface MapboxGL {
  accessToken: string;
  Map: new (opts: Record<string, unknown>) => MGLMap;
  Marker: new (opts?: Record<string, unknown>) => MGLMarker;
  NavigationControl: new () => unknown;
}
declare global {
  interface Window {
    mapboxgl?: MapboxGL;
    __studynookMapboxLoading?: Promise<void>;
  }
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_GL_VERSION = '3.7.0';

function loadMapboxGl(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.mapboxgl) return Promise.resolve();
  if (window.__studynookMapboxLoading) return window.__studynookMapboxLoading;

  window.__studynookMapboxLoading = new Promise<void>((resolve, reject) => {
    if (!MAPBOX_TOKEN) { reject(new Error('no token')); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;
    document.head.appendChild(link);

    const s = document.createElement('script');
    s.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Mapbox GL'));
    document.head.appendChild(s);
  });
  return window.__studynookMapboxLoading;
}

/** Haversine (km) — used to turn map bounds into a radius for the API call. */
function radiusKmFromBounds(center: { lat: number; lng: number }, ne: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((ne.lat - center.lat) * Math.PI) / 180;
  const dLng = ((ne.lng - center.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) * Math.cos((ne.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.min(100, R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function ResultsMap({
  initialLat = 17.9784,
  initialLng = 79.5941,
  initialCentres = [],
  onSelect,
}: {
  initialLat?: number;
  initialLng?: number;
  initialCentres?: MapCentre[];
  onSelect?: (slug: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MGLMap | null>(null);
  const markersRef = useRef<MGLMarker[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [centres, setCentres] = useState<MapCentre[]>(initialCentres);

  const fetchNearby = useCallback(async (lat: number, lng: number, radiusKm: number) => {
    try {
      const url = `/api/centres/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm.toFixed(1)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = (await res.json()) as { items: MapCentre[] };
      setCentres(json.items ?? []);
    } catch {
      /* network hiccup — keep existing pins */
    }
  }, []);

  // Draw markers whenever the centre list changes.
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = window.mapboxgl;
    if (!map || !mapboxgl) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = centres.map((c) => {
      const el = document.createElement('div');
      el.style.cssText = 'width:28px;height:28px;border-radius:50%;background:#2d6a4f;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;';
      el.title = `${c.name} · ★ ${c.rating}`;
      if (onSelect) el.addEventListener('click', () => onSelect(c.slug));
      return new mapboxgl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
    });
  }, [centres, onSelect]);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    loadMapboxGl()
      .then(() => {
        if (cancelled || !divRef.current || !window.mapboxgl) return;
        window.mapboxgl.accessToken = MAPBOX_TOKEN!;
        const map = new window.mapboxgl.Map({
          container: divRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [initialLng, initialLat],
          zoom: 13,
        });
        map.on('load', () => {}); // ensures tiles begin loading immediately
        mapRef.current = map;

        map.on('moveend', () => {
          const c = map.getCenter();
          const ne = map.getBounds().getNorthEast();
          const radius = radiusKmFromBounds(c, ne);
          void fetchNearby(c.lat, c.lng, radius);
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
  }, [initialLat, initialLng, fetchNearby]);

  if (unavailable) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-input bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Map view is unavailable right now. Use the list to browse study spaces.
      </div>
    );
  }

  return <div ref={divRef} className="h-full min-h-64 w-full rounded-xl" aria-label="Map of study spaces" />;
}
