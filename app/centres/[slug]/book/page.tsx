import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/rbac';
import { getCentreBySlug } from '@/features/centres/services/centres.service';
import { BookingPanel } from '@/features/bookings/components/booking-panel';
import type { Period } from '@/features/bookings/pricing';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Book a seat', ...noindex };

const VALID_PERIODS: Period[] = ['hour', 'day', 'week', 'fortnight', 'month', 'quarter', 'half_year', 'year'];

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ period?: string; resource?: string }> };

export default async function BookPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { period, resource } = await searchParams;
  const initialPeriod = VALID_PERIODS.find((p) => p === period);
  const db = await createClient();
  const centre = await getCentreBySlug(db, slug);
  if (!centre || centre.status !== 'approved') notFound();

  const user = await getSessionUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href="/centres" className="hover:underline">Centres</Link> ›{' '}
        <Link href={`/centres/${centre.slug}`} className="hover:underline">{centre.name}</Link> ›{' '}
        <span className="text-foreground">Book</span>
      </nav>

      <h1 className="font-display text-2xl font-bold">Book a seat at {centre.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose an option and how long you need it.</p>

      {!user ? (
        <div className="mt-6 rounded-lg border bg-accent p-4 text-sm">
          Please <Link href={`/login?next=/centres/${centre.slug}/book`} className="font-semibold underline">sign in</Link> to book a seat.
        </div>
      ) : centre.resources.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          This centre hasn’t published bookable options yet.
        </div>
      ) : (
        <BookingPanel
          centreId={centre.id}
          slug={centre.slug}
          initialPeriod={initialPeriod}
          initialResourceId={resource}
          resources={centre.resources.map((r) => ({
            id: r.id,
            label: r.label,
            tier: r.tier,
            pricing: (r.pricing ?? {}) as Record<string, number>,
          }))}
        />
      )}
    </main>
  );
}
