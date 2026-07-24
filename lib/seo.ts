import type { Metadata } from 'next';
import type { CentreDetail } from '@/features/centres/types';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studynook.app';

/**
 * JSON-LD for a study centre. Only emit for approved/public listings.
 * Uses LocalBusiness (charter §SEO permits LocalBusiness, BreadcrumbList).
 */
export function centreJsonLd(centre: CentreDetail): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: centre.name,
    url: `${base}/centres/${centre.slug}`,
    address: centre.address
      ? { '@type': 'PostalAddress', streetAddress: centre.address, addressLocality: centre.area ?? undefined }
      : undefined,
    geo: centre.lat && centre.lng ? { '@type': 'GeoCoordinates', latitude: centre.lat, longitude: centre.lng } : undefined,
    aggregateRating:
      centre.reviews_count > 0
        ? { '@type': 'AggregateRating', ratingValue: centre.rating, reviewCount: centre.reviews_count }
        : undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  };
}

/** Metadata for private/internal pages — dashboards, admin, account (charter §SEO noindex). */
export const noindex: Metadata = { robots: { index: false, follow: false } };

/**
 * SECURITY: safe serializer for JSON-LD injected via dangerouslySetInnerHTML.
 * `JSON.stringify` does not escape `<`, so owner-controlled strings (centre
 * name/description, etc.) containing a literal `</script>` would close the
 * script tag early and let arbitrary HTML/JS run on a public, indexable page.
 * `U+2028`/`U+2029` are also escaped — valid in JSON strings but invalid in
 * JS, which can otherwise break inline parsing in some engines.
 * Always route JSON-LD through this before handing it to
 * dangerouslySetInnerHTML — never call JSON.stringify directly for that.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Organization schema — establishes the brand entity for Google Knowledge Graph.
 * Emitted once, on the homepage.
 */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StudyNook',
    url: base,
    logo: `${base}/icon`,
    description:
      'StudyNook helps students in Warangal find, compare and book study spaces — libraries, study halls, coworking desks and reading rooms.',
    areaServed: { '@type': 'City', name: 'Warangal', addressRegion: 'Telangana', addressCountry: 'IN' },
  };
}

/**
 * WebSite schema with SearchAction — enables the Google sitelinks search box,
 * letting users search StudyNook directly from the SERP.
 */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'StudyNook',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${base}/centres?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
