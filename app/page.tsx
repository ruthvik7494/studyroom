import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/rbac';
import { Card } from '@/components/ui/card';
import { listAllLocations } from '@/features/taxonomy/taxonomy.service';
import { listCentres } from '@/features/centres/services/centres.service';
import { CentreCard } from '@/features/centres/components/centre-card';
import { TestimonialCarousel, type Testimonial } from '@/components/testimonial-carousel';
import { organizationJsonLd, websiteJsonLd, safeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'StudyNook — find & book study spaces in Warangal',
  description: 'Discover, compare and book study halls, reading rooms and coworking spaces near you. Live availability, verified reviews, transparent prices.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const db = await createClient();
  const viewer = await getSessionUser();
  const [{ items: featured }, locations, { count: centresCount }, { count: studentsCount }, { data: testimonialRows }, { data: ratingRows }] = await Promise.all([
    listCentres(db, { limit: 6 }),
    listAllLocations(db),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('reviews')
      .select('id, rating, body, author:author_id(full_name, avatar_url), centres(name, slug)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(6),
    db.from('centres').select('rating').eq('is_published', true).gt('reviews_count', 0),
  ]);

  const testimonials: Testimonial[] = (testimonialRows ?? [])
    .map((r) => {
      const author = r.author as unknown as { full_name: string | null; avatar_url: string | null } | null;
      const centre = r.centres as unknown as { name: string; slug: string } | null;
      if (!centre) return null;
      return {
        id: r.id,
        name: author?.full_name ?? 'Student',
        avatarUrl: author?.avatar_url ?? null,
        rating: r.rating,
        body: r.body ?? '',
        centreName: centre.name,
        centreSlug: centre.slug,
      };
    })
    .filter((t): t is Testimonial => t !== null);

  const avgRating = ratingRows && ratingRows.length > 0
    ? (ratingRows.reduce((s, r) => s + Number(r.rating), 0) / ratingRows.length).toFixed(1)
    : null;

  let savedIds = new Set<string>();
  if (viewer) {
    const { data: savedRows } = await db.from('saved_listings').select('centre_id').eq('user_id', viewer.id);
    savedIds = new Set((savedRows ?? []).map((r) => r.centre_id));
  }

  let heroAmenities: string[] = [];
  if (featured[0]) {
    const { data: amenityRows } = await db.from('centre_amenities').select('amenities(label)').eq('centre_id', featured[0].id);
    heroAmenities = ((amenityRows ?? []) as unknown as Array<{ amenities: { label: string } | null }>)
      .map((r) => r.amenities?.label)
      .filter((l): l is string => !!l);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd([organizationJsonLd(), websiteJsonLd()]) }}
      />

      {/* Hero — the photo is a true full-bleed background layer behind
          everything (text and the floating card both sit on top of it),
          not a separate boxed image next to a separate text column. The
          gradient is opaque where the text sits and fades to fully visible
          photo on the right, so it reads as one section, matching the
          reference. Hidden below `sm` so small screens get a plain readable
          background instead of text fighting with a busy photo underneath. */}
      <section className="relative min-h-[560px] overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-background sm:min-h-[600px]">
        <div className="absolute inset-0 hidden sm:block">
          <Image src="/images/hero-office.png" alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Find the perfect <span className="text-primary">study space</span> near you.
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Discover verified study rooms, reading halls, and coworking spaces that help you focus and achieve more.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2d6a4f" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z" /></svg>
                Verified Centres
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
                Live Availability
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ea580c" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
                Instant Booking
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0d9488" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                Affordable Prices
              </span>
            </div>

            {/* Search — one real field: name/area/landmark. No date field. */}
            <form action="/centres" method="get" className="mt-6 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-[2fr_auto]">
                <input name="q" type="text" placeholder="Search by name, area or landmark" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" />
                <button type="submit" className="h-11 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">Search</button>
              </div>
              {locations.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Popular searches:
                  {locations.slice(0, 5).map((loc) => (
                    <Link key={loc.slug} href={`/centres?area=${encodeURIComponent(loc.name)}`} className="rounded-full border bg-background px-2.5 py-1 hover:bg-secondary">
                      {loc.name}
                    </Link>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Rating badge + featured-centre card float on top of the photo,
              positioned in its right-hand portion where the gradient has
              fully cleared. */}
          {avgRating && (
            <span className="absolute right-6 top-8 hidden h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold2 to-primary text-center shadow-md sm:flex lg:right-10">
              <span className="rounded-full bg-background px-1.5 py-1 text-xs font-bold text-brand-gold2">★ {avgRating}</span>
            </span>
          )}
          {featured[0] && (
            <div className="absolute bottom-8 right-6 hidden w-full max-w-sm rounded-xl bg-background/95 p-3 shadow-md backdrop-blur sm:block lg:right-10">
              <Link href={`/centres/${featured[0].slug}`} className="flex items-center gap-3">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {featured[0].cover_url ? (
                    <Image src={featured[0].cover_url} alt="" fill className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl" aria-hidden>{featured[0].emoji}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold">{featured[0].name}</span>
                  <span className="block truncate text-xs text-muted-foreground">📍 {featured[0].area}</span>
                </span>
              </Link>
              {heroAmenities.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {heroAmenities.slice(0, 4).map((a) => <span key={a}>• {a}</span>)}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between border-t pt-2">
                <span className="font-display text-sm font-bold text-primary">
                  {featured[0].fromMonthly ? `₹${featured[0].fromMonthly}` : '—'}<span className="text-[10px] font-medium text-muted-foreground">/mo</span>
                </span>
                <Link href={`/centres/${featured[0].slug}`} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">View Details</Link>
              </div>
            </div>
          )}
        </div>

        {/* Stats — real counts where we have them; the last two are genuine
            platform capabilities, not invented percentages we can't verify */}
        <div className="border-t bg-secondary/30">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-4">
            {[
              ['🏢', `${centresCount ?? 0}+`, 'Verified Centres'],
              ['🎓', `${studentsCount ?? 0}+`, 'Registered Students'],
              ['📡', 'Live', 'Seat Availability'],
              ['⚡', 'Instant', 'Booking Confirmation'],
            ].map(([icon, big, label]) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-base" aria-hidden>{icon}</span>
                <div>
                  <p className="font-display text-lg font-bold leading-tight">{big}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose StudyNook — single row of 4 */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center">
          <h2 className="font-display text-3xl font-extrabold">Why Choose StudyNook?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Everything you need for a productive and comfortable study experience.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['✓', 'Verified & Trusted', 'All centres are verified for quality, safety & reliability.'],
            ['📡', 'Real-time Availability', 'Check live seat availability before you book.'],
            ['⚡', 'Easy & Quick Booking', 'Book your seat in just a few clicks.'],
            ['💰', 'Affordable for Everyone', 'Choose from a wide range of prices that fit your budget.'],
          ].map(([icon, title, body]) => (
            <Card key={title} className="p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary" aria-hidden>{icon}</span>
              <p className="mt-3 font-display font-bold">{title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Built for Students, Designed for Focus */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <Image src="/images/built-for-students.png" alt="A calm, well-organised study desk" width={900} height={700} className="h-auto w-full object-cover" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight">Built for Students,<br />Designed for Focus.</h2>
            <p className="mt-4 text-muted-foreground">
              Whether you&apos;re preparing for exams, working on projects, or just need a quiet place to read, find a study space that fits how you work.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {['Quiet & comfortable environments', 'High-speed WiFi at most centres', 'Power backup where listed', 'Personal lockers at select centres', 'Clean & hygienic spaces'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary" aria-hidden>✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/centres" className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Explore Study Centres
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Study Spaces */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="text-center">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Popular Study Spaces</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Top rated study spaces loved by students in and around Warangal.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CentreCard key={c.slug} centre={c} showSave={!!viewer} isSaved={savedIds.has(c.id)} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/centres" className="text-sm font-semibold text-primary hover:underline">View all centres →</Link>
          </div>
        </section>
      )}

      {/* What Students Are Saying */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-14">
          <div className="text-center">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">What Students Are Saying</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Real reviews from students who&apos;ve actually studied at these centres.</p>
          </div>
          <div className="mt-10">
            <TestimonialCarousel items={testimonials} />
          </div>
        </section>
      )}

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="relative min-h-[220px] overflow-hidden rounded-2xl bg-[#1f4a37]">
          <Image src="/images/study-cta.png" alt="" fill sizes="(max-width: 1024px) 100vw, 1152px" className="object-cover" />
          <div className="absolute inset-0 bg-[#1f4a37]/25" />
          <div className="relative flex h-full min-h-[220px] flex-col justify-center gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <p className="font-display text-2xl font-bold drop-shadow-sm">Ready to find your perfect study space?</p>
              <p className="mt-1 text-sm text-white/90 drop-shadow-sm">Join students who study better with StudyNook.</p>
            </div>
            <Link href="/centres" className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#1f4a37] hover:bg-white/90">
              Explore Study Centres →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
