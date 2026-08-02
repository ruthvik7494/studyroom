import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCategoryBySlug, listCentresByCategory } from '@/features/taxonomy/taxonomy.service';
import { CentreCard } from '@/features/centres/components/centre-card';
import { CentreEmptyState } from '@/features/centres/components/centre-states';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';
import { getServiceArea } from '@/lib/service-area';

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await createClient();
  const cat = await getCategoryBySlug(db, slug);
  if (!cat) return { title: 'Not found' };
  const { city } = await getServiceArea(db);
  return {
    title: city ? `${cat.name} in ${city}` : cat.name,
    description: cat.description ?? (city
      ? `Browse ${cat.name.toLowerCase()} in ${city} with live availability and verified reviews.`
      : `Browse ${cat.name.toLowerCase()} with live availability and verified reviews.`),
    alternates: { canonical: `/categories/${cat.slug}` },
  };
}

export const revalidate = 300;

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const db = await createClient();
  const cat = await getCategoryBySlug(db, slug);
  if (!cat) notFound();

  const [centres, { city }] = await Promise.all([
    listCentresByCategory(db, slug),
    getServiceArea(db),
  ]);
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/centres' },
    { name: cat.name, path: `/categories/${cat.slug}` },
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Categories' }, { label: cat.name }]} />
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold">{cat.name}{city ? ` in ${city}` : ''}</h1>
        {cat.description && <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>}
      </header>
      {centres.length === 0 ? <CentreEmptyState /> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {centres.map((c) => <CentreCard key={c.id} centre={c} />)}
        </div>
      )}
    </main>
  );
}
