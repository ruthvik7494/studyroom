import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { organizationJsonLd, websiteJsonLd, safeJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'StudyNook — find & book study spaces in Warangal',
  description: 'Discover, compare and book study halls, reading rooms and coworking spaces near you. Live availability, verified reviews, transparent prices.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const db = await createClient();
  const { data: featured } = await db
    .from('centres')
    .select('slug, name, area, emoji, rating, reviews_count')
    .eq('status', 'approved')
    .order('rating', { ascending: false })
    .limit(3);

  return (
    <>
      {/* Organization + WebSite/SearchAction — brand entity and SERP search box. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd([organizationJsonLd(), websiteJsonLd()]) }}
      />
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-brand-gold">Warangal · Telangana</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Find your perfect <span className="text-brand-green">study space</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Compare study halls, reading rooms and coworking spaces near you — with live seat availability, verified reviews and transparent prices.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/centres" className="rounded-md bg-primary px-6 py-3 font-display font-bold text-primary-foreground">Browse centres</Link>
          <Link href="/login" className="rounded-md border px-6 py-3 font-display font-bold">List your centre</Link>
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
