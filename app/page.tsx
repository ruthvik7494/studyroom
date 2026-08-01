import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAllLocations } from '@/features/taxonomy/taxonomy.service';
import { StudyHeroIllustration } from '@/components/study-hero-illustration';
import { ReadingCornerIllustration } from '@/components/reading-corner-illustration';
import { organizationJsonLd, websiteJsonLd, safeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'StudyNook — find & book study spaces in Warangal',
  description: 'Discover, compare and book study halls, reading rooms and coworking spaces near you. Live availability, verified reviews, transparent prices.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const db = await createClient();
  const [{ data: featured }, locations, { count: centresCount }, { count: studentsCount }] = await Promise.all([
    db.from('centres').select('slug, name, area, emoji, rating, reviews_count').eq('status', 'approved').order('rating', { ascending: false }).limit(3),
    listAllLocations(db),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
  ]);

  return (
    <>
      {/* Organization + WebSite/SearchAction — brand entity and SERP search box. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd([organizationJsonLd(), websiteJsonLd()]) }}
      />

      {/* Hero — illustration is a full-bleed background layer (not a boxed card),
          faded into the section's own background on its left edge so the two
          halves read as one continuous piece, matching the reference. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-brand-gold/5">
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[56%] lg:block">
          <StudyHeroIllustration className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14">
          {/* Left — text + search */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <span aria-hidden>●</span> #1 Study Room Platform in Warangal
            </span>

            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Find the Perfect <span className="text-primary">Study Room</span> Near You
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Search from {centresCount ?? 0}+ verified study centres with real-time seat availability and instant booking.
            </p>

            {/* Search bar — real fields wired to /centres' actual search/filter params */}
            <form action="/centres" method="get" className="mt-8 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="text-left">
                  <label htmlFor="hero-area" className="mb-1 block text-xs font-semibold text-muted-foreground">📍 Location</label>
                  <select id="hero-area" name="area" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">All areas</option>
                    {locations.map((loc) => (
                      <option key={loc.slug} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-left">
                  <label htmlFor="hero-q" className="mb-1 block text-xs font-semibold text-muted-foreground">🔍 Search Study Centre</label>
                  <input
                    id="hero-q"
                    name="q"
                    type="text"
                    placeholder="Search by centre name or address…"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <button type="submit" className="mt-3 h-11 w-full rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                Search Now →
              </button>
            </form>

            {/* Stats — real counts where we have them; the other two are genuine platform capabilities, not invented numbers */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden>🏢</span><strong className="text-foreground">{centresCount ?? 0}+</strong> Study Centres</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden>🎓</span><strong className="text-foreground">{studentsCount ?? 0}+</strong> Students</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden>📡</span>Live Seat Availability</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden>⚡</span>Instant Booking Confirmation</span>
            </div>
          </div>

          {/* Right column is a spacer on large screens — the illustration itself
              is the absolutely-positioned full-bleed layer above, behind this
              content, so it reaches the true edge of the viewport. On mobile,
              where that layer is hidden, show it inline instead. */}
          <div className="lg:hidden">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <StudyHeroIllustration className="h-[240px] w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-extrabold">Why Choose StudyNook</h2>
          <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-primary" aria-hidden />
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Everything you need to find, compare and book a study space — built around what actually matters when you're picking where to study.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <ReadingCornerIllustration className="h-[380px] w-full object-cover lg:h-full" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>
                ),
                title: 'Verified Centres',
                body: 'Every "Verified" badge means our team has actually confirmed the listing is genuine.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6 8 7 8-7" /></svg>
                ),
                title: 'Easy to Connect',
                body: 'Message any centre directly with your questions and get a quick reply, right from their page.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /></svg>
                ),
                title: 'Live Seat Availability',
                body: 'See real seat counts before you go — never show up expecting a spot that isn\'t there.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
                ),
                title: 'Instant Booking',
                body: 'Bookings confirm immediately — no waiting for the centre to approve your request.',
              },
            ].map((f) => (
              <Card key={f.title} className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{f.icon}</div>
                <p className="mt-3 font-display font-bold">{f.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {featured && featured.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Top-rated near you</h2>
            <Link href="/centres" className="text-sm font-semibold text-brand-green hover:underline">View all →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map((c) => (
              <Link key={c.slug} href={`/centres/${c.slug}`}>
                <Card className="p-5 transition hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>{c.emoji}</span>
                    <div>
                      <p className="font-display font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">📍 {c.area}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant="success">★ {c.rating.toFixed(1)} · {c.reviews_count} reviews</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
