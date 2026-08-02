import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/rbac';
import { getCentreBySlug } from '@/features/centres/services/centres.service';
import { isSaved } from '@/features/saved/services/saved.service';
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
  const saved = user ? await isSaved(db, user.id, centre.id) : false;
  const social = (centre.social ?? {}) as Record<string, string>;
  const { data: rules } = await db.from('booking_rules').select('cancel_cutoff_hours').eq('centre_id', centre.id).maybeSingle();
  const cancelCutoffHours = rules?.cancel_cutoff_hours ?? 12;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href="/centres" className="hover:underline">Centres</Link> ›{' '}
        <Link href={`/centres/${centre.slug}`} className="hover:underline">{centre.name}</Link> ›{' '}
        <span className="text-foreground">Book</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold">Book a seat at {centre.name}</h1>
        {centre.is_verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">✓ Verified centre</span>
        )}
      </div>
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
          centreName={centre.name}
          centreArea={centre.area}
          coverUrl={centre.cover_url}
          rating={centre.rating}
          phone={centre.phone}
          whatsapp={social.whatsapp || null}
          initialSaved={saved}
          cancelCutoffHours={cancelCutoffHours}
        />
      )}
    </main>
  );
}
