import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { ReadingCornerIllustration } from '@/components/reading-corner-illustration';
import { TestimonialCarousel, type Testimonial } from '@/components/testimonial-carousel';
import { getServiceArea } from '@/lib/service-area';
import { Reveal } from '@/components/motion/reveal';
import { LoadReveal } from '@/components/motion/load-reveal';
import { SlideIn } from '@/components/motion/slide-in';
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger';
import { MotionCta, ArrowGlyph } from '@/components/motion/motion-cta';
import { IconCard } from '@/components/motion/icon-card';
import { AnimatedCounter } from '@/components/motion/animated-counter';

export async function generateMetadata(): Promise<Metadata> {
  const db = await createClient();
  const { city } = await getServiceArea(db);
  return {
    title: 'About StudyNook',
    description: city
      ? `StudyNook helps students in ${city} find, compare and book verified study spaces — study halls, reading rooms, libraries and coworking desks.`
      : 'StudyNook helps students find, compare and book verified study spaces — study halls, reading rooms, libraries and coworking desks.',
    alternates: { canonical: '/about' },
  };
}

const WHY_US = [
  ['✓', 'Verified Centres', 'All centres are verified for quality and safety.'],
  ['📡', 'Live Seat Availability', 'Check real-time seat availability before you go.'],
  ['⚡', 'Instant Booking', 'Book your seat instantly with confirmation.'],
  ['🛡', 'Women-Safe Spaces', 'Specially marked women-safe spaces for peace of mind.'],
  ['⭐', 'Student Reviews', "Real reviews from students who've actually been there."],
  ['💳', 'Affordable Pricing', 'Best prices with no hidden or extra charges.'],
] as const;

const HOW_IT_WORKS = [
  ['🔍', 'Search', 'Search study centres near you.'],
  ['📋', 'Compare', 'Compare prices, amenities and seat availability.'],
  ['📅', 'Book', 'Select your preferred time and book instantly.'],
  ['✓', 'Study', 'Head to the centre and focus on your goals.'],
] as const;

export default async function AboutPage() {
  const db = await createClient();
  const [
    { count: centresCount },
    { count: reviewsCount },
    { count: studentsCount },
    { count: bookingsCount },
    { data: ratingRows },
    { data: testimonialRows },
    serviceArea,
  ] = await Promise.all([
    db.from('centres').select('id', { count: 'exact', head: true }).eq('is_published', true),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed']),
    db.from('centres').select('rating').eq('is_published', true).gt('reviews_count', 0),
    db.from('reviews')
      .select('id, rating, body, author:author_id(full_name, avatar_url), centres(name, slug)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20),
    getServiceArea(db),
  ]);

  const avgRating = ratingRows && ratingRows.length > 0
    ? (ratingRows.reduce((s, r) => s + Number(r.rating), 0) / ratingRows.length).toFixed(1)
    : null;

  const testimonials: Testimonial[] = (testimonialRows ?? [])
    .map((r): Testimonial | null => {
      const author = r.author as unknown as { full_name: string | null; avatar_url: string | null } | null;
      const centre = r.centres as unknown as { name: string; slug: string } | null;
      const fullName = author?.full_name;
      // Only show testimonials with a real name attached (see app/page.tsx for why).
      if (!centre || !fullName) return null;
      return {
        id: r.id,
        name: fullName,
        avatarUrl: author?.avatar_url || `https://i.pravatar.cc/150?u=${r.id}`,
        rating: r.rating,
        body: r.body ?? '',
        centreName: centre.name,
        centreSlug: centre.slug,
      };
    })
    .filter((t): t is Testimonial => t !== null)
    .slice(0, 6);

  const { data: heroPhoto } = await db
    .from('centres')
    .select('name, cover_url')
    .eq('is_published', true)
    .not('cover_url', 'is', null)
    .order('rating', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main id="main-content" className="overflow-x-hidden">
      {/* Hero — full-bleed background photo behind the whole section, same
          treatment as the homepage hero: opaque where the text sits,
          fading to a fully visible photo on the right. */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen min-h-[480px] overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-background sm:min-h-[520px]">
        <div className="absolute inset-0 hidden sm:block">
          {heroPhoto?.cover_url ? (
            <Image src={heroPhoto.cover_url} alt="" fill priority className="object-cover" />
          ) : (
            <Image src="/images/hero-office.png" alt="" fill priority className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background from-0% via-background via-45% to-transparent to-75%" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <LoadReveal>
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">● About StudyNook</span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              India&apos;s trusted platform to <span className="text-primary">discover</span> and <span className="text-primary">book</span> study spaces.
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              We make it simple for students to find verified, affordable and comfortable places to study and focus.
            </p>

            <form action="/centres" method="get" className="mt-6 flex max-w-md gap-2 rounded-full border bg-card p-1.5 shadow-sm">
              <input name="q" type="text" placeholder={serviceArea.city ? `Search study centres in ${serviceArea.city}` : 'Search study centres'} className="h-10 flex-1 rounded-full bg-transparent px-4 text-sm" />
              <button type="submit" className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">Search Centres</button>
            </form>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span>✓ Verified Centres</span>
              <span>✓ Live Availability</span>
              <span>✓ Instant Booking</span>
              <span>✓ Secure Payments</span>
            </div>
          </div>
          </LoadReveal>

          {/* Stat badges float on top of the photo, in its right-hand
              portion where the gradient has fully cleared — same treatment
              as the homepage hero's rating badge + featured-centre card. */}
          <LoadReveal delay={0.4} y={8} className="absolute right-6 top-8 hidden rounded-xl bg-background/95 px-3 py-2 text-center shadow-md backdrop-blur sm:block lg:right-10">
            <span className="block font-display text-lg font-bold">{centresCount ?? 0}+</span>
            <span className="block text-[11px] text-muted-foreground">Study Centres</span>
          </LoadReveal>
          <LoadReveal delay={0.5} y={8} className="absolute right-6 top-24 hidden rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md sm:block lg:right-10">Live Seat Availability</LoadReveal>
          {avgRating && (
            <LoadReveal delay={0.6} y={8} className="absolute bottom-8 right-6 hidden rounded-xl bg-background/95 px-3 py-2 shadow-md backdrop-blur sm:block lg:right-10">
              <span className="block font-display text-sm font-bold text-brand-gold2">{avgRating}/5 ★★★★★</span>
              <span className="block text-[11px] text-muted-foreground">From {reviewsCount ?? 0}+ reviews</span>
            </LoadReveal>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12">


      {/* Stats — real counts from the live database, not invented numbers */}
      <StaggerGroup className="mt-16 grid grid-cols-2 gap-6 rounded-2xl bg-secondary/40 px-8 py-10 sm:grid-cols-4">
        {[
          ['🏢', `${centresCount ?? 0}+`, 'Verified Centres'],
          ['🎓', `${studentsCount ?? 0}+`, 'Registered Students'],
          ['📅', `${bookingsCount ?? 0}+`, 'Bookings Completed'],
          ['⭐', avgRating ? `${avgRating}/5` : '—', 'Average Rating'],
        ].map(([icon, value, label]) => (
          <StaggerItem key={label} className="text-center">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <AnimatedCounter value={value} className="mt-2 font-display text-2xl font-extrabold" />
            <p className="text-sm text-muted-foreground">{label}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>

      {/* Our Mission */}
      <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
        <SlideIn direction="left">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-gold">Our Mission</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
            Helping students find better places to <span className="text-primary">focus and grow</span>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            StudyNook is built to solve a simple problem — finding the right place to study. We bring transparency, real-time availability and trust to every booking.
          </p>
          <MotionCta className="mt-6">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Contact Us <ArrowGlyph />
            </Link>
          </MotionCta>
        </SlideIn>
        <Reveal variant="up" className="overflow-hidden rounded-2xl">
          <ReadingCornerIllustration className="h-[260px] w-full object-cover" />
        </Reveal>
      </div>

      {/* Why students choose us */}
      <Reveal className="mt-16 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-gold">Why Students Choose StudyNook</p>
        <h2 className="mx-auto mt-2 max-w-lg font-display text-2xl font-extrabold sm:text-3xl">Everything you need in one place.</h2>
      </Reveal>
      <StaggerGroup className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WHY_US.map(([icon, title, body]) => (
          <IconCard key={title} icon={icon} title={title} body={body} />
        ))}
      </StaggerGroup>

      {/* How it works */}
      <Reveal className="mt-16 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-gold">How It Works</p>
        <h2 className="mx-auto mt-2 max-w-lg font-display text-2xl font-extrabold sm:text-3xl">Book your study space in 4 simple steps.</h2>
      </Reveal>
      <StaggerGroup stagger={0.12} className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {HOW_IT_WORKS.map(([icon, title, body], i) => (
          <StaggerItem key={title} className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg" aria-hidden>{icon}</span>
            <p className="mt-3 font-display font-bold">{i + 1}. {title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{body}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>

      {/* Testimonials — real published reviews */}
      {testimonials.length > 0 && (
        <div className="mt-16">
          <Reveal className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-gold">What Students Say</p>
            <h2 className="mx-auto mt-2 max-w-lg font-display text-2xl font-extrabold sm:text-3xl">Loved by students{serviceArea.city ? ` across ${serviceArea.city}` : ''}.</h2>
          </Reveal>
          <div className="mx-auto mt-8 max-w-5xl">
            <TestimonialCarousel items={testimonials} />
          </div>
        </div>
      )}

      {/* CTA */}
      <Reveal>
      <Card className="mt-16 flex flex-col items-start gap-4 overflow-hidden bg-[#1f4a37] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xl font-bold">Ready to find your perfect study space?</p>
          <p className="mt-1 text-sm text-white/80">Join students who study better with StudyNook.</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <MotionCta>
            <Link href="/centres" className="block rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#1f4a37] transition-colors hover:bg-white/90">Explore Study Centres <ArrowGlyph /></Link>
          </MotionCta>
          <MotionCta>
            <Link href="/owner/centres/new" className="block rounded-lg border border-white/40 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10">List Your Centre <ArrowGlyph /></Link>
          </MotionCta>
        </div>
      </Card>
      </Reveal>
      </div>
    </main>
  );
}
