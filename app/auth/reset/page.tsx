import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { ResetRequestForm } from '@/features/auth/components/reset-request-form';
import { BrandPanel } from '@/components/brand-panel';
import { getServiceArea } from '@/lib/service-area';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Reset password', ...noindex };

/** Same split-screen shell as /login — brand panel on the right, reusing
 * the same live stats, so the two feel like one connected flow rather than
 * two differently-designed pages. */
export default async function ResetPage() {
  const db = await createClient();
  const [{ count: studentsCount }, { count: centresCount }, { data: ratingRows }, { city }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('centres').select('id', { count: 'exact', head: true }).eq('is_published', true),
    db.from('centres').select('rating').eq('is_published', true).gt('reviews_count', 0),
    getServiceArea(db),
  ]);
  const avgRating = ratingRows && ratingRows.length > 0
    ? (ratingRows.reduce((s, r) => s + Number(r.rating), 0) / ratingRows.length).toFixed(1)
    : null;

  return (
    <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Left — the form */}
      <div className="flex items-center justify-center px-6 py-12">
        <ResetRequestForm />
      </div>

      {/* Right — brand panel (hidden on small screens) */}
      <BrandPanel className="hidden lg:block" stats={{ students: studentsCount ?? 0, centres: centresCount ?? 0, avgRating }} city={city} />
    </main>
  );
}
