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
import { NewsletterForm } from '@/features/newsletter/components/newsletter-form';
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd([organizationJsonLd(), websiteJsonLd()]) }}
      />

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:gap-14">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Find the perfect <span className="text-primary">study space</span> near you.
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Discover verified study rooms, reading halls, and coworking spaces that help you focus and achieve more.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">✓ Verified Centres</span>
              <span className="inline-flex items-center gap-1.5">✓ Live Availability</span>
              <span className="inline-flex items-center gap-1.5">✓ Instant Booking</span>
              <span className="inline-flex items-center gap-1.5">✓ Affordable Prices</span>
            </div>

            {/* Search bar — Location + name search are real, wired filters.
                Date is shown for visual parity with the reference but isn't
                wired to anything: there's no "search centres available on a
                given date" feature built, so it's not a functional filter. */}
            <form action="/centres" method="get" className="mt-6 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <input name="q" type="text" placeholder="Search by name, area or landmark" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" />
                <input type="date" aria-label="Select date (not yet a working filter)" className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground" />
                <button type="submit" className="h-11 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">Search</button>
              </div>
              {locations.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Popular:
                  {locations.slice(0, 5).map((loc) => (
                    <Link key={loc.slug} href={`/centres?area=${encodeURIComponent(loc.name)}`} className="rounded-full border bg-background px-2.5 py-1 hover:bg-secondary">
                      {loc.name}
                    </Link>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Right — the real photo provided, with a floating rating badge and a card for the platform's top-rated centre */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <Image src="/images/hero-office.png" alt="A modern, well-lit study space" width={900} height={600} className="h-[280px] w-full object-cover sm:h-[360px]" priority />
            </div>
            {avgRating && (
              <span className="absolute right-4 top-4 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-background text-center shadow-md">
                <span className="font-display text-sm font-bold text-brand-gold2">★ {avgRating}</span>
              </span>
            )}
            {featured[0] && (
              <Link href={`/centres/${featured[0].slug}`} className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-background/95 p-3 shadow-md backdrop-blur">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-xl" aria-hidden>{featured[0].emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold">{featured[0].name}</span>
                  <span className="block truncate text-xs text-muted-foreground">📍 {featured[0].area}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">View Details</span>
              </Link>
            )}
          </div>
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
        <div className="relative overflow-hidden rounded-2xl bg-[#1f4a37]">
          <Image src="/images/study-cta.png" alt="" fill className="object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f4a37] via-[#1f4a37]/85 to-transparent" />
          <div className="relative flex flex-col gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <p className="font-display text-2xl font-bold">Ready to find your perfect study space?</p>
              <p className="mt-1 text-sm text-white/80">Join students who study better with StudyNook.</p>
            </div>
            <Link href="/centres" className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#1f4a37] hover:bg-white/90">
              Explore Study Centres →
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter — real, working subscription */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Stay updated with new centres &amp; offers</p>
            <p className="text-sm text-muted-foreground">Subscribe to our newsletter.</p>
          </div>
          <div className="w-full sm:w-auto">
            <NewsletterForm />
          </div>
        </Card>
      </section>
    </>
  );
}
