import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAllLocations } from '@/features/taxonomy/taxonomy.service';
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-brand-gold/5">
        <div className="mx-auto max-w-5xl px-6 py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <span aria-hidden>●</span> #1 Study Room Platform in Warangal
          </span>

          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Find the Perfect <span className="text-primary">Study Room</span> Near You
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Search from {centresCount ?? 0}+ verified study centres with real-time seat availability and instant booking.
          </p>

          {/* Search bar — real fields wired to /centres' actual search/filter params */}
          <form action="/centres" method="get" className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
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
              <div className="flex items-end">
                <button type="submit" className="h-11 w-full rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto">
                  Search Now →
                </button>
              </div>
            </div>
          </form>

          {/* Stats — real counts where we have them; the other two are genuine platform capabilities, not invented numbers */}
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden>🏢</span><strong className="text-foreground">{centresCount ?? 0}+</strong> Study Centres</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden>🎓</span><strong className="text-foreground">{studentsCount ?? 0}+</strong> Students</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden>📡</span>Live Seat Availability</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden>⚡</span>Instant Booking Confirmation</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: 'Live availability', d: 'See seats free right now — never show up to a full hall.' },
            { t: 'Verified reviews', d: 'Ratings from students who actually checked in.' },
            { t: 'Transparent prices', d: 'Daily and monthly rates up front, no surprises.' },
          ].map((f) => (
            <Card key={f.t} className="p-5">
              <p className="font-display font-bold">{f.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
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
