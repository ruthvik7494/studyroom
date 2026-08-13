import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getPopularAreas } from '@/features/taxonomy/taxonomy.service';
import { listCentres } from '@/features/centres/services/centres.service';
import { getServiceArea } from '@/lib/service-area';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Theme 2 — Clean Indigo & Warm Amber Corporate', ...noindex };

export default async function Theme2Page() {
  const db = await createClient();
  const [{ items: featured }, serviceArea] = await Promise.all([
    listCentres(db, { limit: 6 }),
    getServiceArea(db),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Banner Notice */}
      <div className="bg-indigo-600 text-white py-2 text-center text-xs font-semibold">
        🎨 Theme Preview 2: Clean Indigo & Warm Amber Academic Minimal
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-900 via-indigo-900 to-indigo-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300 mb-6">
              ✨ Verified Student Space Network
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-tight font-serif">
              Your Quiet Sanctuary for Exam Prep
            </h1>
            <p className="mt-4 text-lg text-indigo-200">
              Discover verified AC reading rooms, 24/7 libraries & study halls in {serviceArea.city || 'Warangal'}. Reserve your personal seat today.
            </p>

            <form action="/centres" method="get" className="mt-8 flex gap-2">
              <input
                name="q"
                type="text"
                placeholder="Enter area (e.g. Hanamkonda, Kazipet)..."
                className="h-12 flex-1 rounded-lg bg-white px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button type="submit" className="h-12 px-6 rounded-lg bg-amber-400 font-bold text-indigo-950 hover:bg-amber-300 transition shadow-md">
                Search Spaces
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-indigo-800/60 border border-indigo-700/50 backdrop-blur-md">
              <span className="text-3xl font-extrabold text-amber-300">100%</span>
              <p className="text-xs text-indigo-200 mt-1">Verified Quiet Zones</p>
            </div>
            <div className="p-6 rounded-2xl bg-indigo-800/60 border border-indigo-700/50 backdrop-blur-md">
              <span className="text-3xl font-extrabold text-amber-300">24/7</span>
              <p className="text-xs text-indigo-200 mt-1">Access Available</p>
            </div>
            <div className="p-6 rounded-2xl bg-indigo-800/60 border border-indigo-700/50 backdrop-blur-md">
              <span className="text-3xl font-extrabold text-amber-300">High-Speed</span>
              <p className="text-xs text-indigo-200 mt-1">Wi-Fi & Charging</p>
            </div>
            <div className="p-6 rounded-2xl bg-indigo-800/60 border border-indigo-700/50 backdrop-blur-md">
              <span className="text-3xl font-extrabold text-amber-300">Women-Safe</span>
              <p className="text-xs text-indigo-200 mt-1">Monitored Premises</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spaces */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Featured Study Centres</h2>
        <p className="text-sm text-slate-600 mt-1">Explore top-ranked halls equipped with modern amenities</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((centre) => (
            <div key={centre.id} className="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="relative h-44 w-full bg-slate-100">
                {centre.coverUrl && <Image src={centre.coverUrl} alt={centre.name} fill className="object-cover" />}
              </div>
              <div className="p-5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{centre.spaceType?.replace('_', ' ') || 'Study Hall'}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{centre.name}</h3>
                <p className="text-xs text-slate-500 mt-1">📍 {centre.address}</p>
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-900">★ {centre.rating.toFixed(1)} rating</span>
                  <Link href={`/centres/${centre.slug}`} className="px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-700 text-white transition">
                    View Details
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
