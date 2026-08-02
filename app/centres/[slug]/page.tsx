import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { BookingSidebar } from '@/features/centres/components/booking-sidebar';
import { getCentreBySlug, getCentreReviews } from '@/features/centres/services/centres.service';
import { getSessionUser } from '@/lib/auth/rbac';
import { centreJsonLd, breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR, cn } from '@/lib/utils';
import { EnquiryForm } from '@/features/enquiries/components/enquiry-form';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { ReportReviewButton } from '@/features/reviews/components/report-review-button';
import { SaveButton } from '@/features/saved/components/save-button';
import { ClaimForm } from '@/features/claims/components/claim-form';
import { ShareButton } from '@/features/centres/components/share-button';
import { GalleryLightbox } from '@/features/centres/components/gallery-lightbox';
import { SocialIcon, type SocialPlatform } from '@/features/centres/components/social-icon';
import { PricingTabs } from '@/features/centres/components/pricing-tabs';
import { PricingSyncProvider } from '@/features/centres/components/pricing-sync';
import { CentreCard } from '@/features/centres/components/centre-card';
import { DetailSectionCard } from '@/features/centres/components/detail-section-card';
import { OpeningHoursCard } from '@/features/centres/components/opening-hours-card';
import { PERIOD_LABEL, priceForPeriod, availablePeriods } from '@/features/bookings/pricing';
import { isSaved } from '@/features/saved/services/saved.service';

/** Returns either an external image URL or a Supabase Storage URL. */
const galleryUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studynook.app';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const SPACE_TYPE_LABEL: Record<string, { label: string; icon: string }> = {
  study_hall: { label: 'Study Hall', icon: '📖' },
  reading_room: { label: 'Reading Room', icon: '📚' },
  coworking: { label: 'Coworking', icon: '💼' },
  both: { label: 'Study + Coworking', icon: '🏢' },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadCentre(slug: string) {
  const db = await createClient();
  return getCentreBySlug(db, slug); // RLS: only approved, or owner/admin, is returned
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const centre = await loadCentre(slug);
  if (!centre) return { title: 'Not found' };

  const isPublic = centre.status === 'approved';
  const desc = `${centre.name} in ${centre.area ?? 'Warangal'} — live availability, ${centre.reviews_count} reviews, rated ${centre.rating}/5.`;
  return {
    title: centre.name,
    description: desc,
    alternates: { canonical: `/centres/${centre.slug}` },
    openGraph: { title: centre.name, description: desc, type: 'website' },
    robots: isPublic ? undefined : { index: false, follow: false },
  };
}


export default async function CentreDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const centre = await loadCentre(slug);
  if (!centre) notFound();

  const db = await createClient();
  const [reviews, viewer, { data: weeklyHours }, { count: studentsCountRaw }] = await Promise.all([
    getCentreReviews(db, centre.id),
    getSessionUser(),
    db.from('centre_hours').select('day_of_week, is_open, opening_time, closing_time').eq('centre_id', centre.id),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
  ]);
  const studentsCount = studentsCountRaw ?? 0;
  const saved = viewer ? await isSaved(db, viewer.id, centre.id) : false;

  const isPublic = centre.status === 'approved';
  const canPreview = !isPublic && (viewer?.id === centre.owner_id || viewer?.role === 'admin');
  const { data: ownerProfile } = centre.owner_id
    ? await admin.from('profiles').select('full_name, avatar_url').eq('id', centre.owner_id).maybeSingle()
    : { data: null };

  // Weekly opening hours — built from the real per-day schedule the owner
  // set while creating/editing their listing (features/centres/schema.ts's
  // `hours` field). A centre with no rows at all hasn't configured this yet.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const todayDow = nowIst.getUTCDay(); // shifted-by-offset Date read via UTC getters = IST wall-clock day
  const nowMinutes = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes();

  const fmtTime = (t: string) => {
    const [hStr, mStr] = t.split(':');
    const h = Number(hStr), m = Number(mStr ?? 0);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Monday-first display order, matching the reference design.
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const schedule = weeklyHours && weeklyHours.length > 0
    ? DISPLAY_ORDER.map((dow) => {
        const row = weeklyHours.find((h) => h.day_of_week === dow);
        const isOpen = row?.is_open ?? false;
        const is24h = !!row && row.opening_time === '00:00:00' && (row.closing_time === '23:59:00' || row.closing_time === '00:00:00');
        return {
          label: DOW_LABELS[dow]!,
          isOpen,
          is24h,
          text: !isOpen ? 'Closed' : row?.opening_time && row?.closing_time ? `${fmtTime(row.opening_time)} – ${fmtTime(row.closing_time)}` : 'Closed',
          isToday: dow === todayDow,
        };
      })
    : null;

  let todayOpen: boolean | null = null;
  let todayText = '';
  if (schedule) {
    const today = schedule.find((d) => d.isToday)!;
    todayText = today.is24h ? 'Open 24h' : today.text;
    if (!today.isOpen) {
      todayOpen = false;
    } else if (today.is24h) {
      todayOpen = true;
    } else {
      const row = weeklyHours!.find((h) => h.day_of_week === todayDow)!;
      const [oh = 0, om = 0] = row.opening_time!.split(':').map(Number);
      const [ch = 0, cm = 0] = row.closing_time!.split(':').map(Number);
      const openMin = oh * 60 + om, closeMin = ch * 60 + cm;
      todayOpen = closeMin > openMin ? nowMinutes >= openMin && nowMinutes < closeMin : nowMinutes >= openMin || nowMinutes < closeMin;
    }
  }
  const nowLabel = nowIst.toLocaleString('en-IN', {
    timeZone: 'UTC', // nowIst is already shifted; format its UTC fields as wall-clock IST
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });

  const spaceType = SPACE_TYPE_LABEL[centre.space_type] ?? SPACE_TYPE_LABEL.study_hall!;
  const totalSeats = centre.resources.reduce((sum, r) => sum + (r.unit_count ?? 0), 0);
  const fullAddress = [centre.address, centre.city, centre.state, centre.postcode, centre.country].filter(Boolean).join(', ');
  const pageUrl = `${SITE_URL}/centres/${centre.slug}`;

  // Today's Seat Availability — real hourly capacity from the same function
  // that powers the booking page's slot picker, grouped into 3-hour blocks
  // for a quick-glance view (not a separate, invented data source).
  const todayISODate = nowIst.toISOString().slice(0, 10);
  const primaryResource = centre.resources[0];
  const todayBlocks: { label: string; seatsFree: number; capacity: number; isPast: boolean }[] = [];
  if (primaryResource) {
    const { data: todaySlots } = await db.rpc('resource_hour_slots', { p_resource_id: primaryResource.id, p_date: todayISODate, p_period: 'hour' });
    const fmtH = (h: number) => { const p = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12} ${p}`; };
    const slots = todaySlots ?? [];
    for (let i = 0; i < slots.length; i += 3) {
      const chunk = slots.slice(i, i + 3);
      if (chunk.length === 0) continue;
      const startH = chunk[0]!.hour;
      const endH = chunk[chunk.length - 1]!.hour + 1;
      const capacity = chunk[0]!.capacity;
      const seatsFree = Math.max(0, Math.min(...chunk.map((s) => s.capacity - s.taken)));
      todayBlocks.push({ label: `${fmtH(startH)} - ${fmtH(endH === 24 ? 0 : endH)}`, seatsFree, capacity, isPast: chunk.every((s) => s.is_past) });
    }
  }

  const social = (centre.social ?? {}) as Record<string, string>;
  const socialLinks: [string, string, SocialPlatform][] = [
    ['Facebook', social.facebook, 'facebook'], ['Instagram', social.instagram, 'instagram'], ['YouTube', social.youtube, 'youtube'],
    ['LinkedIn', social.linkedin, 'linkedin'], ['X (Twitter)', social.twitter, 'twitter'], ['WhatsApp', social.whatsapp, 'whatsapp'],
    ['Google Business', social.googleBusiness, 'googleBusiness'],
  ].filter(([, url]) => !!url) as [string, string, SocialPlatform][];

  const jsonLd = [
    centreJsonLd(centre),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Study spaces', path: '/centres' },
      { name: centre.name, path: `/centres/${centre.slug}` },
    ]),
  ];

  return (
    <main>
      {isPublic && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      )}

      {/* Full-width header/cover image. No fixed height — a fixed box forces a
          choice between cropping (object-cover) or letterboxing (object-contain);
          a plain full-width image with auto height shows the photo's real
          proportions, always full width, never cropped. */}
      <div className="relative w-full bg-gradient-to-br from-secondary to-accent">
        {centre.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={centre.cover_url} alt={`${centre.name} study space`} className="mx-auto block h-auto max-h-[340px] w-full" />
        ) : (
          <span className="flex h-[260px] w-full items-center justify-center text-8xl sm:h-[340px]" aria-hidden>{centre.emoji}</span>
        )}
        {centre.gallery.length > 0 && (
          <a href="#gallery-heading" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-background">
            <span aria-hidden>📷</span> View all {centre.gallery.length} photos
          </a>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* White card overlapping the bottom of the cover image, matching the reference exactly */}
        <div className="relative z-10 -mt-14 rounded-2xl border bg-card p-4 shadow-md sm:-mt-16 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {centre.logo_url ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm sm:h-24 sm:w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={centre.logo_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border bg-secondary text-4xl sm:h-24 sm:w-24" aria-hidden>{centre.emoji}</span>
            )}

            <div className="min-w-0 flex-1">
              {centre.is_verified && (
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <svg aria-hidden viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Zm-1.2 13.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3Z" /></svg>
                  Verified Centre
                </span>
              )}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <h1 className="min-w-0 break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">{centre.name}</h1>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-gold2/10 px-3 py-1 text-sm font-bold text-brand-gold2">
                  <span aria-hidden>★</span>{centre.rating.toFixed(1)}
                  <span className="font-medium text-muted-foreground">({centre.reviews_count} reviews)</span>
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <span aria-hidden>📍</span>{fullAddress || centre.area}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                {schedule && (
                  <span className={cn('inline-flex items-center gap-1.5 font-semibold', todayOpen ? 'text-primary' : 'text-destructive')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', todayOpen ? 'bg-primary' : 'bg-destructive')} aria-hidden />
                    {todayOpen ? 'Open Now' : 'Closed Now'}
                  </span>
                )}
                {centre.occupancy && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span aria-hidden>👤</span>{centre.occupancy.seatsFree} Seats Available</span>
                )}
                {totalSeats > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span aria-hidden>👥</span>{totalSeats} Total Seats</span>
                )}
                {centre.women_safe_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-plum/10 px-2.5 py-0.5 text-xs font-semibold text-brand-plum">🛡 Women-safe</span>
                )}
              </div>
            </div>
          </div>

          {/* Action row — 4-up grid, matching the reference; wraps to 2 columns on very small screens */}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4">
            {centre.phone && (
              <a href={`tel:${centre.phone}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold hover:bg-secondary">
                <span aria-hidden>📞</span> Call
              </a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#25D366]/40 py-2 text-sm font-semibold text-[#128C36] hover:bg-[#25D366]/5">
                <span aria-hidden>💬</span> WhatsApp
              </a>
            )}
            {centre.lat != null && centre.lng != null && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${centre.lat},${centre.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold hover:bg-secondary"
              >
                <span aria-hidden>🧭</span> Directions
              </a>
            )}
            {centre.website && (
              <a href={centre.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold hover:bg-secondary">
                <span aria-hidden>🌐</span> Website
              </a>
            )}
          </div>
        </div>

        {canPreview && (
          <div className="mt-4 rounded-md border border-brand-gold/40 bg-accent px-4 py-2 text-sm text-accent-foreground" role="status">
            Preview — this listing is <strong>{centre.status.replace('_', ' ')}</strong> and not visible to the public.
          </div>
        )}

        {/* Secondary actions — kept as real, working functionality even though the reference doesn't show them in this exact spot */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isPublic && viewer && <SaveButton centreId={centre.id} initialSaved={saved} />}
          <ShareButton title={centre.name} url={pageUrl} />
          {isPublic && !centre.owner_id && viewer && (
            <a href="#claim-heading" className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-secondary">
              <span aria-hidden>🏷</span> Claim listing
            </a>
          )}
        </div>

        <nav aria-label="Section links" className="mt-4 flex gap-5 overflow-x-auto border-b text-sm font-semibold text-muted-foreground">
          {[
            ['About', 'description-heading'], ['Amenities', 'amenities-heading'], ['Pricing', 'pricing-heading'],
            ['Gallery', 'gallery-heading'], ['Reviews', 'reviews-heading'], ['Location', 'map-heading'],
          ].map(([label, id]) => (
            <a key={id} href={`#${id}`} className="shrink-0 border-b-2 border-transparent pb-2.5 hover:border-primary hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>

        <PricingSyncProvider pricing={centre.resources[0] ? ((centre.resources[0].pricing ?? {}) as Record<string, number>) : null}>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left column — main content */}
          <div className="space-y-6 lg:col-span-2">
            <DetailSectionCard
              icon="☰"
              title="About"
              headingId="description-heading"
            >
              {centre.description ? (
                <p className="whitespace-pre-line text-sm text-foreground/80">{centre.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description yet.</p>
              )}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span aria-hidden>{spaceType.icon}</span>{spaceType.label}
              </span>
            </DetailSectionCard>

            <DetailSectionCard icon="🎫" title="Seat Pricing" headingId="pricing-heading">
              {centre.resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pricing details coming soon.</p>
              ) : (
                <>
                  <PricingTabs
                    slug={centre.slug}
                    resource={{ id: centre.resources[0]!.id, label: centre.resources[0]!.label, tier: centre.resources[0]!.tier, pricing: (centre.resources[0]!.pricing ?? {}) as Record<string, number> }}
                  />
                  {centre.resources.length > 1 && (
                    <div className="mt-5 space-y-3 border-t pt-4">
                      <p className="text-xs font-semibold text-muted-foreground">Other options at this centre</p>
                      {centre.resources.slice(1).map((r) => {
                        const pricing = (r.pricing ?? {}) as Record<string, number>;
                        const periods = availablePeriods(pricing);
                        return (
                          <Card key={r.id} className="p-4">
                            <p className="font-semibold">{r.label}</p>
                            <p className="text-xs capitalize text-muted-foreground">{r.resource_type.replace('_', ' ')}{r.tier ? ` · ${r.tier}` : ''}</p>
                            {periods.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">—</p>
                            ) : (
                              <dl className="mt-2 space-y-0.5">
                                {periods.map((p) => (
                                  <div key={p} className="flex items-center justify-between text-sm">
                                    <dt className="text-muted-foreground">{PERIOD_LABEL[p]}</dt>
                                    <dd className="font-display font-bold text-brand-green">{formatINR(priceForPeriod(pricing, p)!)}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </DetailSectionCard>

            {todayBlocks.length > 0 && (
              <DetailSectionCard icon="🕐" title="Today's Seat Availability">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {todayBlocks.map((b) => {
                    const pct = b.capacity > 0 ? b.seatsFree / b.capacity : 0;
                    const style = b.isPast
                      ? 'bg-secondary/50 text-muted-foreground/60'
                      : pct === 0 ? 'bg-red-50 text-red-700'
                      : pct < 0.3 ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700';
                    return (
                      <div key={b.label} className={cn('rounded-lg p-3 text-center', style)}>
                        <p className="text-xs font-medium opacity-80">{b.label}</p>
                        <p className="mt-1 font-display text-lg font-bold">{b.isPast ? '—' : b.seatsFree}</p>
                        <p className="text-[11px] opacity-70">{b.isPast ? 'Passed' : `of ${b.capacity} seats`}</p>
                      </div>
                    );
                  })}
                </div>
              </DetailSectionCard>
            )}

            {centre.tags && centre.tags.length > 0 && (
              <DetailSectionCard icon="✨" title="Highlights">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {centre.tags.map((tag) => (
                    <div key={tag} className="flex items-center gap-2 text-sm text-foreground/80">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm" aria-hidden>✨</span>
                      {tag}
                    </div>
                  ))}
                </div>
              </DetailSectionCard>
            )}

            {centre.amenities.length > 0 && (
              <DetailSectionCard icon="🏛" title="Facilities" headingId="amenities-heading">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {centre.amenities.map((a) => (
                    <div key={a.slug} className="flex items-center gap-2 text-sm text-foreground/80">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm" aria-hidden>{a.icon ?? '•'}</span>
                      {a.label}
                    </div>
                  ))}
                </div>
              </DetailSectionCard>
            )}

            {centre.gallery.length > 0 && (
              <DetailSectionCard icon="🖼" title="Gallery" headingId="gallery-heading">
                <GalleryLightbox
                  images={centre.gallery.map((img) => ({ id: img.id, url: galleryUrl(img.storage_path), alt: img.alt ?? `${centre.name} photo` }))}
                  previewCount={6}
                />
              </DetailSectionCard>
            )}

            {isPublic && !centre.owner_id && viewer && (
              <DetailSectionCard icon="🏷" title="Own this centre?" headingId="claim-heading">
                <p className="mb-3 text-sm text-muted-foreground">Claim it to manage the listing, respond to enquiries and update details.</p>
                <ClaimForm centreId={centre.id} />
              </DetailSectionCard>
            )}

            <DetailSectionCard icon="💬" title="Reviews" headingId="reviews-heading">
              {isPublic && viewer && viewer.id !== centre.owner_id && (
                <div className="mb-4"><ReviewForm centreId={centre.id} /></div>
              )}
              {isPublic && !viewer && (
                <p className="mb-4 text-sm text-muted-foreground">
                  <a href={`/login?next=/centres/${centre.slug}`} className="font-semibold underline">Sign in</a> to write a review.
                </p>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rv) => (
                    <Card key={rv.id} className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-brand-gold2" aria-label={`${rv.rating} out of 5`}>{'★'.repeat(rv.rating)}<span className="text-muted-foreground/40">{'★'.repeat(5 - rv.rating)}</span></span>
                        {rv.is_verified && <Badge variant="success">✓ Verified visit</Badge>}
                        <span className="ml-auto text-xs text-muted-foreground">{new Date(rv.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      {rv.body && <p className="mt-2 text-sm text-foreground/80">{rv.body}</p>}
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">— {rv.author?.full_name ?? 'Student'}</p>
                        <ReportReviewButton reviewId={rv.id} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </DetailSectionCard>
          </div>

          {/* Right column — no longer sticky (removed per request); the top
              card visually overlaps the cover image via a negative margin,
              matching the reference. */}
          <div className="space-y-6 lg:-mt-20">
            <BookingSidebar
              slug={centre.slug}
              isPublic={isPublic}
              pricing={centre.resources[0] ? ((centre.resources[0].pricing ?? {}) as Record<string, number>) : null}
              seatsFree={centre.occupancy?.seatsFree ?? null}
              phone={centre.phone}
              whatsapp={social.whatsapp || null}
              studentsCount={studentsCount}
            />

            {ownerProfile?.full_name && (
              <Card className="p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Centre Owner</p>
                <div className="flex items-center gap-3">
                  {ownerProfile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ownerProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {ownerProfile.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <p className="font-semibold">{ownerProfile.full_name}</p>
                </div>
              </Card>
            )}

            <Card className="p-4" id="hours-heading">
              {schedule ? (
                <OpeningHoursCard todayOpen={todayOpen} todayText={todayText} days={schedule} nowLabel={nowLabel} />
              ) : (
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">🕐</span>
                  <span className="font-bold">Hours</span>
                  <span className="ml-auto text-sm text-muted-foreground">Not listed</span>
                </div>
              )}
            </Card>

            {/* Location — map, address, contact & social all together, matching the reference's single "Location" card */}
            <Card className="p-5" id="map-heading">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary" aria-hidden>📍</span>
                <h2 className="font-display text-base font-bold">Location</h2>
              </div>
              {centre.lat != null && centre.lng != null && MAPBOX_TOKEN && (
                <div className="relative mb-4 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+2d6a4f(${centre.lng},${centre.lat})/${centre.lng},${centre.lat},14,0/500x220@2x?access_token=${MAPBOX_TOKEN}`}
                    alt={`Map showing ${centre.name}'s location`}
                    className="h-40 w-full object-cover"
                  />
                  {centre.is_verified && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-[11px] font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />VERIFIED LOCATION
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-3 text-sm">
                {fullAddress && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base text-primary" aria-hidden>📍</span>
                    <span>{fullAddress}</span>
                  </div>
                )}
                {centre.phone && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base text-primary" aria-hidden>📞</span>
                    <a href={`tel:${centre.phone}`} className="text-primary hover:underline">{centre.phone}</a>
                  </div>
                )}
                {centre.alt_phone && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base text-primary" aria-hidden>📞</span>
                    <a href={`tel:${centre.alt_phone}`} className="text-primary hover:underline">{centre.alt_phone}</a>
                    <span className="text-xs text-muted-foreground">(alternate)</span>
                  </div>
                )}
                {centre.business_email && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base text-primary" aria-hidden>✉️</span>
                    <a href={`mailto:${centre.business_email}`} className="text-primary hover:underline">{centre.business_email}</a>
                  </div>
                )}
                {centre.website && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base text-primary" aria-hidden>🌐</span>
                    <a href={centre.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{centre.website}</a>
                  </div>
                )}
              </div>
              {socialLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                  {socialLinks.map(([label, url, platform]) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" title={label} className="group flex h-9 w-9 items-center justify-center rounded-full border hover:bg-secondary">
                      <SocialIcon platform={platform} />
                    </a>
                  ))}
                </div>
              )}
            </Card>

            {centre.status === 'approved' && (
              <DetailSectionCard icon="✉" title="Contact Form" headingId="contact-heading">
                <EnquiryForm centreId={centre.id} />
              </DetailSectionCard>
            )}
          </div>
        </div>
        </PricingSyncProvider>

        {centre.similar.length > 0 && (
          <section aria-labelledby="similar-heading" className="mt-8">
            <h2 id="similar-heading" className="mb-3 font-display text-lg font-bold">You may also be interested in</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {centre.similar.map((s) => (
                <CentreCard key={s.id} centre={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
