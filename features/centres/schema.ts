import { z } from 'zod';

/**
 * A URL restricted to http(s). Plain z.string().url() accepts javascript:, data:,
 * and other schemes that become XSS vectors when rendered as links, so every
 * user-supplied URL (website, social) goes through this instead.
 */
const httpUrl = (msg = 'Enter a valid URL') =>
  z.string().trim().max(200).url(msg).refine(
    (u) => /^https?:\/\//i.test(u),
    { message: 'URL must start with http:// or https://' },
  );

/** "abc.com" → "https://abc.com" — only when a scheme isn't already present. */
export const withHttps = (v: string): string => {
  const t = v.trim();
  if (!t || /^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
};
const isValidUrl = (v: string): boolean => {
  try { return /^https?:\/\//i.test(v) && !!new URL(v).hostname; } catch { return false; }
};
const hostMatches = (url: string, domain: string): boolean => {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, '');
    return h === domain || h.endsWith(`.${domain}`);
  } catch { return false; }
};

/** Any website — auto-prepends https:// if the scheme is missing, no domain restriction. */
const websiteUrl = () =>
  z.string().trim().max(200).optional().or(z.literal(''))
    .transform((v) => (v ? withHttps(v) : v))
    .refine((v) => !v || isValidUrl(v), { message: 'Enter a valid website URL' });

/** Helper to convert handle/username or partial URL into full valid social link, or return empty string if blank */
const smartSocialUrl = (val: string, domains: string[], defaultDomain: string): string => {
  const t = (val || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t) || domains.some((d) => t.toLowerCase().includes(d))) {
    return withHttps(t);
  }
  return `https://${defaultDomain}/${t.replace(/^\//, '')}`;
};

/** A URL that must belong to one of the given domains — auto-formats handles, domain links, or leaves blank if empty. */
const domainUrl = (domains: string[], label: string) =>
  z.string().trim().max(200).optional().or(z.literal(''))
    .transform((v) => (v ? smartSocialUrl(v || '', domains, domains[0] || '') : ''))
    .refine((v) => !v || isValidUrl(v), { message: 'Enter a valid URL' })
    .refine((v) => !v || domains.some((d) => hostMatches(v, d)), { message: `Please use a ${label} link (e.g. ${domains[0]})` });


/** Query params for the discovery feed — validated at every entry point. */
export const centreSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  spaceType: z.enum(['study_hall', 'reading_room', 'coworking', 'both']).optional(),
  womenSafe: z.coerce.boolean().optional(),
  maxMonthly: z.coerce.number().int().positive().max(100_000).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  // keyset cursor (opaque to the client; base64 in the URL)
  cursorRating: z.coerce.number().min(0).max(5).optional(),
  cursorId: z.string().uuid().optional(),
});
export type CentreSearch = z.infer<typeof centreSearchSchema>;

/**
 * Nearby ("search near me") params. When lat/lng are present the feed switches
 * to distance-ordered results within radiusKm via the search_centres_nearby RPC.
 */
export const nearbySearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(100).default(5),
  spaceType: z.enum(['study_hall', 'reading_room', 'coworking', 'both']).optional(),
  womenSafe: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
export type NearbySearch = z.infer<typeof nearbySearchSchema>;

/**
 * A <form> always submits every field, so a blank number input arrives as the
 * empty string, not a missing key. z.coerce.number() turns '' into 0 (JS's
 * `Number('')` is 0, not NaN) — which then failed `maxPrice`'s `.positive()`
 * check and threw, crashing the whole page any time min/max were left blank
 * (e.g. searching by name alone). Stripping '' to undefined first makes a
 * blank field genuinely optional again.
 */
const optionalPositiveNumber = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => (v === '' || v === undefined ? undefined : v), schema.optional());

/**
 * Numbered-pagination discovery params (distinct from the keyset feed above,
 * which still powers infinite-scroll elsewhere — this backs the /centres page
 * redesign: page numbers, name/address search, price range, price sort).
 */
export const centrePaginatedSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  minPrice: optionalPositiveNumber(z.coerce.number().nonnegative().max(1_000_000)),
  maxPrice: optionalPositiveNumber(z.coerce.number().positive().max(1_000_000)),
  spaceType: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['study_hall', 'reading_room', 'coworking', 'both']).optional()),
  womenSafe: z.coerce.boolean().optional(),
  sort: z.enum(['rating', 'price_asc', 'price_desc']).default('rating'),
  view: z.enum(['grid', 'list']).default('grid'),
  page: z.preprocess((v) => (v === '' || v === undefined ? 1 : v), z.coerce.number().int().min(1).default(1)),
});
export type CentrePaginatedSearch = z.infer<typeof centrePaginatedSearchSchema>;

/** Owner create/update payload. */
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** One weekday's hours. day 0 = Sunday .. 6 = Saturday — matches JS Date.getDay() and Postgres EXTRACT(DOW). */
const dayHoursSchema = z.object({
  isOpen: z.coerce.boolean().default(true),
  openingTime: z.string().regex(TIME_RE, 'Invalid time').default('09:00'),
  closingTime: z.string().regex(TIME_RE, 'Invalid time').default('22:00'),
});
const DEFAULT_WEEKLY_HOURS = Array.from({ length: 7 }, () => ({ isOpen: true, openingTime: '09:00', closingTime: '22:00' }));

/** Validates website domains like "example.com" or "http(s)://example.com" */
const flexibleWebsiteUrl = () =>
  z.string().trim().max(200).optional().or(z.literal(''))
    .refine(
      (v) => {
        const cleaned = (v || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
        return !cleaned || /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(cleaned);
      },
      { message: 'Enter a valid website (e.g. example.com or studycentre.in)' }
    )
    .transform((v) => (v ? withHttps(v) : undefined));

export const centreUpsertSchema = z.object({
  name: z.string().trim().min(1, 'Centre Name is required').default('Test Centre'),
  roomName: z.string().trim().optional().default('AC Room'),
  address: z.string().trim().optional().or(z.literal('')).default('Test Address'),
  city: z.string().trim().optional().or(z.literal('')).default('Delhi'),
  state: z.string().trim().optional().or(z.literal('')).default('Delhi'),
  country: z.string().trim().optional().or(z.literal('')).default('India'),
  postcode: z.string().trim().regex(/^\d{6}$/, 'Postcode must be a 6-digit Indian PIN code'),
  spaceType: z.enum(['study_hall', 'reading_room', 'coworking', 'both']).default('study_hall'),
  lat: z.preprocess(
    (v) => (v === '' || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.coerce.number().min(-90).max(90).optional(),
  ),
  lng: z.preprocess(
    (v) => (v === '' || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.coerce.number().min(-180).max(180).optional(),
  ),
  emoji: z.string().max(4).default('📖'),
  // contact
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  altPhone: z.string().trim().optional().or(z.literal(''))
    .refine((v) => !v || /^[6-9]\d{9}$/.test(v), { message: 'Enter a valid 10-digit mobile number' }),
  businessEmail: z.string().trim().optional().or(z.literal(''))
    .refine((v) => !v || z.string().email().safeParse(v).success, { message: 'Enter a valid email address' }),
  website: flexibleWebsiteUrl(),
  // Google Places import: the Place ID captured from the picker
  googlePlaceId: z.string().trim().max(300).optional(),
  priceHourly: optionalPositiveNumber(z.coerce.number().optional()),
  priceDaily: optionalPositiveNumber(z.coerce.number().optional()),
  priceWeekly: optionalPositiveNumber(z.coerce.number().optional()),
  priceFortnightly: optionalPositiveNumber(z.coerce.number().optional()),
  priceMonthly: optionalPositiveNumber(z.coerce.number().optional()),
  priceQuarterly: optionalPositiveNumber(z.coerce.number().optional()),
  priceHalfYearly: optionalPositiveNumber(z.coerce.number().optional()),
  priceYearly: optionalPositiveNumber(z.coerce.number().optional()),
  seats: z.coerce.number().optional().default(10),
  about: z.string().trim().optional().or(z.literal('')).default('Test Description for centre.'),
  amenityIds: z.array(z.string().uuid()).max(40).default([]),
  tags: z.array(z.string().trim().max(30)).max(20).default([]),
  womenSafeClaim: z.coerce.boolean().default(false),
  /** Exactly 7 entries, index 0 = Sunday .. 6 = Saturday. */
  hours: z.array(dayHoursSchema).length(7).default(DEFAULT_WEEKLY_HOURS),
  facebook: domainUrl(['facebook.com', 'fb.com'], 'Facebook'),
  instagram: domainUrl(['instagram.com'], 'Instagram'),
  youtube: domainUrl(['youtube.com', 'youtu.be'], 'YouTube'),
  linkedin: domainUrl(['linkedin.com'], 'LinkedIn'),
  twitter: domainUrl(['twitter.com', 'x.com'], 'X (Twitter)'),
  whatsapp: domainUrl(['wa.me', 'whatsapp.com'], 'WhatsApp'),
  googleBusiness: domainUrl(['g.page', 'goo.gl', 'google.com'], 'Google Business'),
  extraSpaces: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      seats: z.string().optional(),
      prices: z.record(z.string(), z.string()).optional(),
      tags: z.array(z.string()).optional(),
    })
  ).optional().default([]),
});
export type CentreUpsert = z.infer<typeof centreUpsertSchema>;

/**
 * Social links — every value must be a valid http(s) URL (M3: social URL validation).
 * Restricted to http/https to block javascript:/data: schemes that .url() alone allows
 * (an XSS vector if rendered as a link). WhatsApp accepts a phone-style value.
 */
export const socialLinksSchema = z.object({
  instagram: httpUrl('Instagram must be a valid URL').optional().or(z.literal('')),
  facebook:  httpUrl('Facebook must be a valid URL').optional().or(z.literal('')),
  youtube:   httpUrl('YouTube must be a valid URL').optional().or(z.literal('')),
  whatsapp:  z.string().trim().max(20).optional().or(z.literal('')),
}).partial();
export type SocialLinks = z.infer<typeof socialLinksSchema>;

/** Amenity selection — array of amenity IDs the owner ticks on the form. */
export const centreAmenitiesSchema = z.object({
  centreId: z.string().uuid(),
  amenityIds: z.array(z.string().uuid()).max(40),
});
export type CentreAmenities = z.infer<typeof centreAmenitiesSchema>;

/**
 * Admin "Create Centre" quick-create form (Admin Dashboard milestone).
 * Deliberately flatter than the owner flow (centreUpsertSchema): no map-picker
 * lat/lng, no space type — this is a fast data-entry path for staff, not the
 * owner onboarding wizard. Price becomes the centre's one default resource's
 * monthly price (see adminCreateCentre); "seats" is that resource's capacity,
 * defaulted to 10 since the form doesn't ask for it explicitly but booking
 * capacity can't function with zero seats — admin can adjust the real count
 * directly in Supabase until a seat-management UI exists.
 */
export const adminCentreCreateBaseSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120),
  address: z.string().trim().min(2, 'Address is too short').max(240),
  priceHourly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceDaily: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceMonthly: z.coerce.number().int().positive().max(1_000_000).optional(),
  about: z.string().trim().max(2000).optional().or(z.literal('')),
  seats: z.coerce.number().int().positive().max(1000).default(10),
  amenityIds: z.array(z.string().uuid()).max(40).default([]),
  isVerified: z.coerce.boolean().default(false),
  womenSafe: z.coerce.boolean().default(false),
});
export const adminCentreCreateSchema = adminCentreCreateBaseSchema.refine(
  (v) => v.priceHourly !== undefined || v.priceDaily !== undefined || v.priceMonthly !== undefined,
  { message: 'Enter at least one price (hourly, daily, or monthly)', path: ['priceMonthly'] },
);
export type AdminCentreCreate = z.infer<typeof adminCentreCreateSchema>;

/** Verification document registration (after upload to Storage). */
export const centreDocumentSchema = z.object({
  centreId: z.string().uuid(),
  storagePath: z.string().trim().min(1).max(400),
  docType: z.enum(['license', 'gst', 'ownership_proof', 'other']).default('other'),
  label: z.string().trim().max(120).optional(),
});
export type CentreDocument = z.infer<typeof centreDocumentSchema>;
