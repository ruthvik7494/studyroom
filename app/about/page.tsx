import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'About StudyNook',
  description:
    'StudyNook helps students in Warangal find, compare and book verified study spaces — study halls, reading rooms, libraries and coworking desks.',
  alternates: { canonical: '/about' },
};

const WHY_US = [
  { icon: '📡', title: 'Live Availability', body: 'See real seat counts before you go — never show up to a full hall.' },
  { icon: '⭐', title: 'Verified Reviews', body: 'Ratings from students who actually checked in, not anonymous noise.' },
  { icon: '💳', title: 'Transparent Pricing', body: 'Daily and monthly rates shown up front — no surprise charges.' },
  { icon: '🛡', title: 'Women-Safe Spaces', body: 'Listings verified for women-safe access, clearly marked on every card.' },
];

/** Real photos from actual approved centres, not stock photography. */
async function getCollagePhotos() {
  const db = await createClient();
  const { data } = await db
    .from('centres')
    .select('name, cover_url')
    .eq('is_published', true)
    .not('cover_url', 'is', null)
    .order('rating', { ascending: false })
    .limit(4);
  return data ?? [];
}

async function getStats() {
  const db = await createClient();
  const [centres, reviews, students, locations] = await Promise.all([
    db.from('centres').select('id', { count: 'exact', head: true }).eq('is_published', true),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('locations').select('id', { count: 'exact', head: true }),
  ]);
  return {
    centres: centres.count ?? 0,
    reviews: reviews.count ?? 0,
    students: students.count ?? 0,
    locations: locations.count ?? 0,
  };
}

/** Collage tile: a real centre photo if we have one at this slot, otherwise a themed placeholder. */
function CollageTile({ photo, emoji, className }: { photo?: { name: string; cover_url: string | null }; emoji: string; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-accent ${className}`}>
      {photo?.cover_url ? (
        <Image src={photo.cover_url} alt={photo.name} fill sizes="280px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>{emoji}</span>
      )}
    </div>
  );
}

export default async function AboutPage() {
  const [photos, stats] = await Promise.all([getCollagePhotos(), getStats()]);
  const emojiFallbacks = ['📚', '☕', '💻', '🪑'];

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero — photo collage + intro */}
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="grid h-[420px] grid-cols-2 grid-rows-2 gap-4">
          <CollageTile photo={photos[0]} emoji={emojiFallbacks[0]!} className="" />
          <CollageTile photo={photos[1]} emoji={emojiFallbacks[1]!} className="" />
          <CollageTile photo={photos[2]} emoji={emojiFallbacks[2]!} className="" />
          <CollageTile photo={photos[3]} emoji={emojiFallbacks[3]!} className="" />
        </div>

        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            A trusted directory for study spaces in Warangal.
          </h1>
          <p className="mt-4 text-muted-foreground">
            StudyNook is a directory and booking platform for study spaces in Warangal, Telangana. We help
            students find a place to focus — study halls, reading rooms, libraries and coworking desks —
            with live availability, verified reviews and transparent pricing. Every listing is reviewed
            before it goes live; owners manage their own availability and pricing, and students book and
            pay in a few taps, with instant confirmation.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg" aria-hidden>✓</span>
              <div>
                <p className="font-display font-bold">Verified Listings</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Every centre is reviewed by our team before it goes public.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg" aria-hidden>📡</span>
              <div>
                <p className="font-display font-bold">Live Availability</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Real seat counts, updated as students check in and out.</p>
              </div>
            </div>
          </div>

          <Link href="/contact" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Contact Us <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* Stats — real counts from the live database, not invented numbers */}
      <div className="mt-16 grid grid-cols-2 gap-6 rounded-2xl bg-secondary/40 px-8 py-10 sm:grid-cols-4">
        {[
          { icon: '🏢', value: stats.centres, label: 'Study Spaces' },
          { icon: '⭐', value: stats.reviews, label: 'Student Reviews' },
          { icon: '🎓', value: stats.students, label: 'Registered Students' },
          { icon: '📍', value: stats.locations, label: 'Areas Covered' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <span className="text-2xl" aria-hidden>{s.icon}</span>
            <p className="mt-2 font-display text-2xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Why choose us */}
      <div className="mt-16 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-gold">Why Choose Us</p>
        <h2 className="mx-auto mt-2 max-w-lg font-display text-2xl font-extrabold sm:text-3xl">
          Built around what actually helps students find a seat.
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY_US.map((f) => (
          <div key={f.title} className="rounded-2xl border p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xl" aria-hidden>{f.icon}</span>
            <p className="mt-4 font-display font-bold">{f.title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
