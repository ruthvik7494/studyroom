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
import { formatINR } from '@/lib/utils';
import { EnquiryForm } from '@/features/enquiries/components/enquiry-form';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { ReportReviewButton } from '@/features/reviews/components/report-review-button';
import { SaveButton } from '@/features/saved/components/save-button';
import { CheckInButton } from '@/features/checkins/components/check-in-button';
import { ClaimForm } from '@/features/claims/components/claim-form';
import { ResultsMap } from '@/features/centres/components/results-map';
import { CentreCard } from '@/features/centres/components/centre-card';
import { isSaved } from '@/features/saved/services/saved.service';
import type { Json } from '@/types/database.types';

/** Public URL for a listing-images Storage object. */
// const galleryUrl = (path: string) =>
//   `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;


/** Returns either an external image URL or a Supabase Storage URL. */
const galleryUrl = (path: string) => {
  if (!path) return '';

  // External image (e.g. Picsum, Cloudinary, etc.)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Supabase Storage image
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
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
    // don't index drafts/pending/rejected/suspended even if an owner can view them
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

export default async function CentreDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const centre = await loadCentre(slug);
  if (!centre) notFound();

  const db = await createClient();
  const [reviews, viewer] = await Promise.all([getCentreReviews(db, centre.id), getSessionUser()]);
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

  const jsonLd = [
    centreJsonLd(centre),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Study spaces', path: '/centres' },
      { name: centre.name, path: `/centres/${centre.slug}` },
    ]),
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-6">
      {isPublic && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      )}

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Study spaces', href: '/centres' }, { label: centre.name }]} />

      {canPreview && (
        <div className="mb-4 rounded-md border border-brand-gold/40 bg-accent px-4 py-2 text-sm text-accent-foreground" role="status">
          Preview — this listing is <strong>{centre.status.replace('_', ' ')}</strong> and not visible to the public.
        </div>
      )}

      <header className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-accent text-4xl">
          {centre.cover_url ? (
            <Image
              src={centre.cover_url}
              alt={`${centre.name} study space`}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>{centre.emoji}</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">{centre.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">📍 {centre.area} · <span className="text-brand-gold2">★</span> {centre.rating.toFixed(1)} ({centre.reviews_count})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {centre.is_verified && <Badge variant="secondary">✓ Verified</Badge>}
            {centre.women_safe_verified && <Badge variant="safe">🛡 Women-safe</Badge>}
            {centre.occupancy && (
              <Badge variant={centre.occupancy.status === 'full' ? 'warning' : 'success'}>
                {centre.occupancy.seatsFree} seats free
              </Badge>
            )}
          </div>
        </div>
      </header>

      {centre.address && <p className="mt-4 text-sm text-foreground/80">{centre.address}</p>}

      {/* Save (any signed-in user) — persists to `saved_listings` */}
      {isPublic && viewer && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SaveButton centreId={centre.id} initialSaved={saved} />
          <CheckInButton centreId={centre.id} inHere={inHere} busyElsewhere={busyElsewhere} />
        </div>
      )}

      {/* Resources / pricing */}
      <section aria-labelledby="pricing-heading" className="mt-8">
        <h2 id="pricing-heading" className="mb-3 font-display text-lg font-bold">Seats & pricing</h2>
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
      </section>

      {/* Gallery — extra photos beyond the cover */}
      {centre.gallery.length > 0 && (
        <section aria-labelledby="gallery-heading" className="mt-8">
          <h2 id="gallery-heading" className="mb-3 font-display text-lg font-bold">Gallery</h2>
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
        </section>
      )}

      {/* Amenities */}
      {centre.amenities.length > 0 && (
        <section aria-labelledby="amenities-heading" className="mt-8">
          <h2 id="amenities-heading" className="mb-3 font-display text-lg font-bold">Facilities</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {centre.amenities.map((a) => (
              <div key={a.slug} className="flex items-center gap-2 text-sm text-foreground/80">
                <span aria-hidden className="text-base">{a.icon ?? '•'}</span>
                {a.label}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claim — only for unowned, approved listings; persists to `listing_claims` */}
      {isPublic && !centre.owner_id && viewer && (
        <section aria-labelledby="claim-heading" className="mt-8">
          <h2 id="claim-heading" className="mb-1 font-display text-lg font-bold">Own this centre?</h2>
          <p className="mb-3 text-sm text-muted-foreground">Claim it to manage the listing, respond to enquiries and update details.</p>
          <Card className="max-w-xl p-5"><ClaimForm centreId={centre.id} /></Card>
        </section>
      )}

      {/* Contact — persists to `enquiries` (see docs/FORM_TO_DB_MAPPING.md #5) */}
      {centre.status === 'approved' && (
        <section aria-labelledby="contact-heading" className="mt-8">
          <h2 id="contact-heading" className="mb-3 font-display text-lg font-bold">Contact this centre</h2>
          <Card className="max-w-xl p-5">
            <EnquiryForm centreId={centre.id} />
          </Card>
        </section>
      )}

      {/* Reviews */}
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="mb-3 font-display text-lg font-bold">Reviews</h2>

        {/* Write-a-review: signed-in non-owners only, on approved listings.
            Server still enforces auth + one-per-centre + no-self-review. */}
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
      </section>

      {/* Location map — pin for this centre (needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          degrades to a message without it) */}
      {centre.lat != null && centre.lng != null && (
        <section aria-labelledby="map-heading" className="mt-8">
          <h2 id="map-heading" className="mb-3 font-display text-lg font-bold">Location</h2>
          <div className="h-72">
            <ResultsMap
              initialLat={centre.lat}
              initialLng={centre.lng}
              initialCentres={[{ id: centre.id, slug: centre.slug, name: centre.name, lat: centre.lat, lng: centre.lng, rating: centre.rating }]}
            />
          </div>
          {centre.address && <p className="mt-2 text-sm text-muted-foreground">{centre.address}</p>}
        </section>
      )}

      {/* Similar centres — same area */}
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
    </main>
  );
}
