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

/** A URL that must belong to one of the given domains (e.g. Facebook link must be facebook.com) — auto-prepends https:// the same way. */
const domainUrl = (domains: string[], label: string) =>
  z.string().trim().max(200).optional().or(z.literal(''))
    .transform((v) => (v ? withHttps(v) : v))
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
const optionalPositiveNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v === undefined ? undefined : v), schema.optional());

/**
 * Numbered-pagination discovery params (distinct from the keyset feed above,
 * which still powers infinite-scroll elsewhere — this backs the /centres page
 * redesign: page numbers, name/address search, price range, price sort).
 */
export const centrePaginatedSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  minPrice: optionalPositiveNumber(z.coerce.number().nonnegative().max(1_000_000)),
  maxPrice: optionalPositiveNumber(z.coerce.number().positive().max(1_000_000)),
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
  openingTime: z.string().regex(TIME_RE, 'Invalid time').default('06:00'),
  closingTime: z.string().regex(TIME_RE, 'Invalid time').default('22:00'),
});
const DEFAULT_WEEKLY_HOURS = Array.from({ length: 7 }, () => ({ isOpen: true, openingTime: '06:00', closingTime: '22:00' }));

export const centreUpsertSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120),
  address: z.string().trim().min(2, 'Address is too short').max(240),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  country: z.string().trim().max(100).default('India'),
  postcode: z.string().trim().max(12).optional().or(z.literal('')),
  spaceType: z.enum(['study_hall', 'reading_room', 'coworking', 'both']),
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
  phone: z.string().trim().max(20).optional(),
  altPhone: z.string().trim().max(20).optional().or(z.literal('')),
  businessEmail: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  website: websiteUrl(),
  // Google Places import: the Place ID captured from the picker
  googlePlaceId: z.string().trim().max(300).optional(),
  // Pricing/capacity/content — every period is its own independent field now
  // (not derived from Daily/Monthly); an owner fills in whichever they offer.
  priceHourly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceDaily: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceWeekly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceFortnightly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceMonthly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceQuarterly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceHalfYearly: z.coerce.number().int().positive().max(1_000_000).optional(),
  priceYearly: z.coerce.number().int().positive().max(1_000_000).optional(),
  seats: z.coerce.number().int().positive().max(1000).default(10),
  about: z.string().trim().max(2000).optional().or(z.literal('')),
  amenityIds: z.array(z.string().uuid()).max(40).default([]),
  tags: z.array(z.enum(['Quiet', 'Premium', 'Affordable', 'AC', 'Library', '24x7', 'Students', 'Professionals'])).max(20).default([]),
  womenSafeClaim: z.coerce.boolean().default(false),
  /** Exactly 7 entries, index 0 = Sunday .. 6 = Saturday. */
  hours: z.array(dayHoursSchema).length(7).default(DEFAULT_WEEKLY_HOURS),
  // Social — folded in here so the wizard's step 5 is part of the same form.
  facebook: domainUrl(['facebook.com', 'fb.com'], 'Facebook'),
  instagram: domainUrl(['instagram.com'], 'Instagram'),
  youtube: domainUrl(['youtube.com', 'youtu.be'], 'YouTube'),
  linkedin: domainUrl(['linkedin.com'], 'LinkedIn'),
  twitter: domainUrl(['twitter.com', 'x.com'], 'X (Twitter)'),
  whatsapp: domainUrl(['wa.me', 'whatsapp.com'], 'WhatsApp'),
  googleBusiness: domainUrl(['g.page', 'goo.gl', 'google.com'], 'Google Business'),
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
