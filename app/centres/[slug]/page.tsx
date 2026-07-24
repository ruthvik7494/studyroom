import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
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
import { isSaved } from '@/features/saved/services/saved.service';
import type { Json } from '@/types/database.types';

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

const monthPrice = (pricing: Json): number | null => {
  if (pricing && typeof pricing === 'object' && !Array.isArray(pricing)) {
    const m = (pricing as Record<string, Json>).month;
    return typeof m === 'number' ? m : null;
  }
  return null;
};

/** "6:00 AM" from a Postgres `time` string like "06:00:00". */
function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default async function CentreDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const centre = await loadCentre(slug);
  if (!centre) notFound();

  const db = await createClient();
  const [reviews, viewer, { data: hours }] = await Promise.all([
    getCentreReviews(db, centre.id),
    getSessionUser(),
    db.from('booking_rules').select('opening_time, closing_time').eq('centre_id', centre.id).maybeSingle(),
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

  // Open/closed, from booking_rules if the owner/admin has set one up — most
  // centres don't have a row yet (there's no UI for it elsewhere in the app
  // either), so this degrades to "Hours not listed" rather than guessing.
  let openStatus: { open: boolean; text: string } | null = null;
  if (hours) {
    const is24h = hours.opening_time.startsWith('00:00') && (hours.closing_time.startsWith('23:5') || hours.closing_time.startsWith('24:00'));
    if (is24h) {
      openStatus = { open: true, text: 'Open 24h today' };
    } else {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const [oh = 0, om = 0] = hours.opening_time.split(':').map(Number);
      const [ch = 0, cm = 0] = hours.closing_time.split(':').map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;
      const isOpen = closeMin > openMin ? nowMin >= openMin && nowMin < closeMin : nowMin >= openMin || nowMin < closeMin;
      openStatus = { open: isOpen, text: `${formatTime(hours.opening_time)} – ${formatTime(hours.closing_time)}` };
    }
  }

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

        <header className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-3xl font-bold tracking-tight">{centre.name}</h1>
            {centre.is_verified && <Badge variant="secondary">✓ Verified</Badge>}
            {centre.women_safe_verified && <Badge variant="safe">🛡 Women-safe</Badge>}
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span aria-hidden>📍</span>{centre.area}</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <span aria-hidden className="text-brand-gold2">★</span>{centre.rating.toFixed(1)}
            </span>
            <span>({centre.reviews_count} review{centre.reviews_count === 1 ? '' : 's'})</span>
          </p>

          {centre.address && <p className="mt-1.5 text-sm text-foreground/70">{centre.address}</p>}

          {centre.occupancy && (() => {
            const status = STATUS_STYLE[centre.occupancy.status] ?? STATUS_STYLE.unknown!;
            return (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green">
                <span aria-hidden className={cn('h-2 w-2 rounded-full', status.dot)} />
                {centre.occupancy.seatsFree} seats free
              </p>
            );
          })()}

          {isPublic && viewer && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SaveButton centreId={centre.id} initialSaved={saved} />
              <CheckInButton centreId={centre.id} inHere={inHere} busyElsewhere={busyElsewhere} />
            </div>
          )}
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

            <DetailSectionCard icon="🎫" title="Seats & pricing" headingId="pricing-heading">
              {centre.resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pricing details coming soon.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {centre.resources.map((r) => {
                    const m = monthPrice(r.pricing);
                    return (
                      <Card key={r.id} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-semibold">{r.label}</p>
                          <p className="text-xs capitalize text-muted-foreground">{r.resource_type.replace('_', ' ')}{r.tier ? ` · ${r.tier}` : ''}</p>
                        </div>
                        <p className="font-display font-bold text-brand-green">{m ? `${formatINR(m)}/mo` : '—'}</p>
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
            <DetailSectionCard
              icon="🕐"
              title={openStatus?.open ? 'Open' : openStatus ? 'Closed' : 'Hours'}
              action={openStatus && (
                <span className={openStatus.open ? 'font-semibold text-brand-green' : 'font-semibold text-destructive'}>
                  {openStatus.open ? 'Open' : 'Closed'}
                </span>
              )}
            >
              <p className="text-sm text-muted-foreground">{openStatus?.text ?? 'Hours not listed'}</p>
            </DetailSectionCard>

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
                <EnquiryForm centreId={centre.id} />
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
