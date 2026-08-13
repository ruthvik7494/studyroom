import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getPopularAreas } from '@/features/taxonomy/taxonomy.service';
import { listCentres } from '@/features/centres/services/centres.service';
import { CentreCard } from '@/features/centres/components/centre-card';
import { getServiceArea } from '@/lib/service-area';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Theme 1 — Modern Dark Glassmorphism', ...noindex };

export default async function Theme1Page() {
  const db = await createClient();
  const [{ items: featured }, popularAreas, serviceArea] = await Promise.all([
    listCentres(db, { limit: 6 }),
    getPopularAreas(db, 3),
    getServiceArea(db),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Banner Notice */}
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 py-2 text-center text-xs font-semibold text-emerald-400">
        🎨 Theme Preview 1: Modern Dark & Neon Emerald Glassmorphism
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 lg:py-32">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-400 tracking-wide uppercase mb-6 backdrop-blur-md">
            ⚡ Premium Co-Study Spaces in {serviceArea.city || 'Warangal'}
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent leading-tight">
            Focus Better. Achieve More.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
            Reserve quiet reading rooms, 24/7 study halls, and ergonomic desks in seconds. Live seat tracking & instant confirmation.
          </p>

          {/* Search Box */}
          <form action="/centres" method="get" className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-2 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row gap-2">
            <input
              name="q"
              type="text"
              placeholder="Search area, landmark or study hall..."
              className="h-14 flex-1 rounded-xl bg-slate-950 px-4 text-slate-100 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500 transition"
            />
            <button type="submit" className="h-14 px-8 rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25">
              Explore Spaces →
            </button>
          </form>
        </div>
      </section>

      {/* Featured Spaces */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Popular Study Spaces</h2>
            <p className="text-sm text-slate-400 mt-1">Hand-picked top rated study hubs</p>
          </div>
          <Link href="/centres" className="text-sm font-semibold text-emerald-400 hover:underline">View All →</Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((centre) => (
            <div key={centre.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-emerald-500/50 transition group">
              <div className="relative h-48 w-full bg-slate-800">
                {centre.cover_url && <Image src={centre.cover_url} alt={centre.name} fill className="object-cover group-hover:scale-105 transition duration-500" />}
                <span className="absolute top-3 right-3 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-emerald-400">
                  ★ {centre.rating.toFixed(1)}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-white">{centre.name}</h3>
                <p className="text-sm text-slate-400 mt-1">📍 {centre.area}</p>
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-lg font-extrabold text-emerald-400">From ₹1,200/mo</span>
                  <Link href={`/centres/${centre.slug}`} className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition">
                    Book Desk
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
