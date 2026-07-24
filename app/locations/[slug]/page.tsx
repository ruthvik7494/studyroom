import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLocationBySlug, listCentresByLocation } from '@/features/taxonomy/taxonomy.service';
import { CentreCard } from '@/features/centres/components/centre-card';
import { CentreEmptyState } from '@/features/centres/components/centre-states';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await createClient();
  const loc = await getLocationBySlug(db, slug);
  if (!loc) return { title: 'Not found' };
  return {
    title: `Study spaces in ${loc.name}`,
    description: `Find study halls, reading rooms and coworking seats in ${loc.name} with live availability and verified reviews.`,
    alternates: { canonical: `/locations/${loc.slug}` },
  };
}

export const revalidate = 300;

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;
  const db = await createClient();
  const loc = await getLocationBySlug(db, slug);
  if (!loc) notFound();

  const centres = await listCentresByLocation(db, slug);
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Locations', path: '/centres' },
    { name: loc.name, path: `/locations/${loc.slug}` },
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Locations' }, { label: loc.name }]} />
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold">Study spaces in {loc.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Warangal · live availability and verified reviews.</p>
      </header>
      {centres.length === 0 ? <CentreEmptyState /> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {centres.map((c) => <CentreCard key={c.id} centre={c} />)}
        </div>
      )}
    </main>
  );
}
