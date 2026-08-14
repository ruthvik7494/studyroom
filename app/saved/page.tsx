import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { getSavedCentres } from '@/features/saved/services/saved.service';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Saved', ...noindex };
export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const user = await requireUser();
  const db = await createClient();
  const saved = await getSavedCentres(db, user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">Saved centres</h1>
      {saved.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="font-display font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap “Save” on any centre to keep it here.</p>
          <Link href="/centres" className="mt-4 inline-block text-sm font-semibold underline">Browse centres</Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {saved.map((s) => {
            const c = s.centres as unknown as { slug: string; name: string; area: string | null; emoji: string; rating: number; reviews_count: number } | null;
            if (!c) return null;
            return (
              <Link key={c.slug} href={`/centres/${c.slug}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:shadow-md">
                  <span className="text-2xl" aria-hidden>{c.emoji}</span>
                  <div>
                    <p className="font-display font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">📍 {c.area} · ★ {c.rating.toFixed(1)} ({c.reviews_count})</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
