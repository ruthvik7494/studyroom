import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCentreBySlug, getCentreReviews } from '@/features/centres/services/centres.service';
import { getSessionUser } from '@/lib/auth/rbac';
import { centreJsonLd, breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR, cn } from '@/lib/utils';
import { EnquiryForm } from '@/features/enquiries/components/enquiry-form';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { ReportReviewButton } from '@/features/reviews/components/report-review-button';
import { SaveButton } from '@/features/saved/components/save-button';
import { CheckInButton } from '@/features/checkins/components/check-in-button';
import { ClaimForm } from '@/features/claims/components/claim-form';
import { ResultsMap } from '@/features/centres/components/results-map';
import { CentreCard, STATUS_STYLE } from '@/features/centres/components/centre-card';
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
  const [reviews, viewer, { data: weeklyHours }] = await Promise.all([
    getCentreReviews(db, centre.id),
    getSessionUser(),
    db.from('centre_hours').select('day_of_week, is_open, opening_time, closing_time').eq('centre_id', centre.id),
  ]);
  const saved = viewer ? await isSaved(db, viewer.id, centre.id) : false;

  // Open check-in state for the check-in button (one open check-in per user).
  let inHere = false, busyElsewhere = false;
  if (viewer) {
    const { data: openCheckIn } = await db
      .from('check_ins')
      .select('centre_id')
      .eq('user_id', viewer.id)
      .is('checked_out_at', null)
      .maybeSingle();
    if (openCheckIn) { inHere = openCheckIn.centre_id === centre.id; busyElsewhere = !inHere; }
  }
  const isPublic = centre.status === 'approved';
  const canPreview = !isPublic && (viewer?.id === centre.owner_id || viewer?.role === 'admin');

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

      {/* Full-width header/cover image */}
      <div className="relative h-[375px] w-full overflow-hidden bg-gradient-to-br from-secondary to-accent">
        {centre.cover_url ? (
          <Image src={centre.cover_url} alt={`${centre.name} study space`} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-8xl" aria-hidden>{centre.emoji}</span>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Study spaces', href: '/centres' }, { label: centre.name }]} />

        {canPreview && (
          <div className="mb-4 rounded-md border border-brand-gold/40 bg-accent px-4 py-2 text-sm text-accent-foreground" role="status">
            Preview — this listing is <strong>{centre.status.replace('_', ' ')}</strong> and not visible to the public.
          </div>
        )}

        <header className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {centre.logo_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={centre.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-full border object-cover" />
                )}
                <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{centre.name}</h1>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold2/10 px-3 py-1 text-sm font-bold text-brand-gold2">
                  <span aria-hidden>★</span>{centre.rating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {centre.reviews_count} review{centre.reviews_count === 1 ? '' : 's'}
                </span>
                <span aria-hidden className="text-muted-foreground/30">•</span>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <span aria-hidden>📍</span>{centre.area}
                </span>
              </div>

              {(centre.address || centre.city) && (
                <p className="mt-2 text-sm text-foreground/60">
                  {[centre.address, centre.city, centre.state, centre.postcode, centre.country].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {centre.is_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">✓ Verified</span>
                )}
                {centre.women_safe_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-plum/10 px-3 py-1 text-xs font-semibold text-brand-plum">🛡 Women-safe</span>
                )}
                {centre.occupancy && (() => {
                  const status = STATUS_STYLE[centre.occupancy.status] ?? STATUS_STYLE.unknown!;
                  return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
                      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                      {centre.occupancy.seatsFree} seats free
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Save + Check-in — kept, and given more room/prominence on the right */}
            {isPublic && viewer && (
              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-stretch">
                <SaveButton centreId={centre.id} initialSaved={saved} />
                <CheckInButton centreId={centre.id} inHere={inHere} busyElsewhere={busyElsewhere} />
              </div>
            )}
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Left column — main content */}
          <div className="space-y-6 lg:col-span-2">
            <DetailSectionCard icon="☰" title="Description" headingId="description-heading">
              {centre.description ? (
                <p className="whitespace-pre-line text-sm text-foreground/80">{centre.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description yet.</p>
              )}
            </DetailSectionCard>

            <DetailSectionCard
              icon="🎫"
              title="Seats & pricing"
              headingId="pricing-heading"
              action={isPublic && centre.resources.length > 0 && (
                <Link
                  href={`/centres/${centre.slug}/book`}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Book a seat
                </Link>
              )}
            >
              {centre.resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pricing details coming soon.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {centre.resources.map((r) => {
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
            </DetailSectionCard>

            {centre.gallery.length > 0 && (
              <DetailSectionCard icon="🖼" title="Gallery" headingId="gallery-heading">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {centre.gallery.map((img) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={img.id}
                      src={galleryUrl(img.storage_path)}
                      alt={img.alt ?? `${centre.name} photo`}
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              </DetailSectionCard>
            )}

            {centre.lat != null && centre.lng != null && (
              <DetailSectionCard icon="📍" title="Location" headingId="map-heading">
                <div className="h-72 overflow-hidden rounded-md">
                  <ResultsMap
                    initialLat={centre.lat}
                    initialLng={centre.lng}
                    initialCentres={[{ id: centre.id, slug: centre.slug, name: centre.name, lat: centre.lat, lng: centre.lng, rating: centre.rating }]}
                  />
                </div>
                {centre.address && <p className="mt-2 text-sm text-muted-foreground">{centre.address}</p>}
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

          {/* Right column — sidebar */}
          <div className="space-y-6">
            <Card className="p-4">
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

            <DetailSectionCard icon="▦" title="Category">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg" aria-hidden>{spaceType.icon}</span>
                <span className="text-sm">{spaceType.label}</span>
              </div>
            </DetailSectionCard>

            {centre.amenities.length > 0 && (
              <DetailSectionCard icon="✓" title="Popular Facilities">
                <div className="space-y-2">
                  {centre.amenities.map((a) => (
                    <div key={a.slug} className="flex items-center gap-2 text-sm text-foreground/80">
                      <span aria-hidden className="text-base">{a.icon ?? '•'}</span>
                      {a.label}
                    </div>
                  ))}
                </div>
              </DetailSectionCard>
            )}

            {centre.status === 'approved' && (
              <DetailSectionCard icon="✉" title="Contact business" headingId="contact-heading">
                {(centre.phone || centre.alt_phone || centre.business_email || centre.website) && (
                  <div className="mb-4 space-y-1 border-b pb-4 text-sm">
                    {centre.phone && <p>📞 <a href={`tel:${centre.phone}`} className="hover:underline">{centre.phone}</a></p>}
                    {centre.alt_phone && <p>📞 <a href={`tel:${centre.alt_phone}`} className="hover:underline">{centre.alt_phone}</a> <span className="text-xs text-muted-foreground">(alternate)</span></p>}
                    {centre.business_email && <p>✉ <a href={`mailto:${centre.business_email}`} className="hover:underline">{centre.business_email}</a></p>}
                    {centre.website && <p>🌐 <a href={centre.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{centre.website}</a></p>}
                  </div>
                )}
                <EnquiryForm centreId={centre.id} />
                {(() => {
                  const social = (centre.social ?? {}) as Record<string, string>;
                  const links: [string, string][] = [
                    ['Facebook', social.facebook], ['Instagram', social.instagram], ['YouTube', social.youtube],
                    ['LinkedIn', social.linkedin], ['X (Twitter)', social.twitter], ['WhatsApp', social.whatsapp],
                    ['Google Business', social.googleBusiness],
                  ].filter(([, url]) => !!url) as [string, string][];
                  return links.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      {links.map(([label, url]) => (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary">
                          {label}
                        </a>
                      ))}
                    </div>
                  ) : null;
                })()}
              </DetailSectionCard>
            )}
          </div>
        </div>

        {centre.similar.length > 0 && (
          <section aria-labelledby="similar-heading" className="mt-8">
            <h2 id="similar-heading" className="mb-3 font-display text-lg font-bold">Similar study spaces nearby</h2>
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
