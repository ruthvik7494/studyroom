import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { listCentres } from '@/features/centres/services/centres.service';
import { getServiceArea } from '@/lib/service-area';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Theme 4 — Ultra-Clean Modern Light & Soft Teal', ...noindex };

export default async function Theme4Page() {
  const db = await createClient();
  const [{ items: featured }, serviceArea] = await Promise.all([
    listCentres(db, { limit: 6 }),
    getServiceArea(db),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Top Banner Notice */}
      <div className="bg-teal-50 border-b border-teal-100 py-2.5 text-center text-xs font-semibold text-teal-800">
        ✨ Theme Preview 4: Ultra-Clean Minimalist Light Mode & Soft Teal Accents
      </div>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              S
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">Study<span className="text-teal-600">Nook</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="/centres" className="hover:text-teal-600 transition">Find Spaces</Link>
            <Link href="/about" className="hover:text-teal-600 transition">How it Works</Link>
            <Link href="/contact" className="hover:text-teal-600 transition">Contact</Link>
          </div>
          <Link href="/login" className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition shadow-sm">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 lg:py-28 bg-gradient-to-b from-teal-50/60 via-white to-slate-50">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100/80 px-4 py-1.5 text-xs font-semibold text-teal-800 mb-6 border border-teal-200">
            🌱 Quiet, Verified & Comfortable Study Rooms in {serviceArea.city || 'Warangal'}
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Find your quiet space to <span className="text-teal-600 underline decoration-teal-300 decoration-wavy underline-offset-8">focus and excel</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
            Discover and book top-rated AC reading halls, 24/7 library desks, and quiet co-study spaces with transparent monthly plans.
          </p>

          {/* Search Box */}
          <form action="/centres" method="get" className="mx-auto mt-10 max-w-2xl bg-white rounded-2xl p-2.5 shadow-xl shadow-slate-200/50 border border-slate-200/80 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center px-4 gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                name="q"
                type="text"
                placeholder="Search area, landmark or study hall..."
                className="w-full h-12 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm"
              />
            </div>
            <button type="submit" className="h-12 px-7 rounded-xl bg-teal-600 hover:bg-teal-700 font-semibold text-white transition text-sm shadow-md shadow-teal-600/20">
              Search Spaces
            </button>
          </form>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Verified Security</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> 100% Power Backup</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> High-Speed Wi-Fi</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> Women-Safe Zones</span>
          </div>
        </div>
      </section>

      {/* Featured Spaces */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Recommended Study Spaces</h2>
            <p className="text-sm text-slate-500 mt-1">Verified reading halls with active seat bookings</p>
          </div>
          <Link href="/centres" className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
            Browse All <span>→</span>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((centre) => (
            <div key={centre.id} className="group rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-teal-200 transition duration-300">
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                {centre.coverUrl && <Image src={centre.coverUrl} alt={centre.name} fill className="object-cover group-hover:scale-105 transition duration-500" />}
                <span className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-slate-900 shadow-sm border border-slate-100">
                  ★ {centre.rating.toFixed(1)}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 uppercase tracking-wide">
                    {centre.spaceType?.replace('_', ' ') || 'Study Hall'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-teal-600 transition">{centre.name}</h3>
                <p className="text-xs text-slate-500 mt-1">📍 {centre.area}</p>

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">Starting from</span>
                    <span className="text-base font-extrabold text-slate-900">₹1,200<span className="text-xs font-normal text-slate-500">/mo</span></span>
                  </div>
                  <Link href={`/centres/${centre.slug}`} className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-teal-600 text-white transition shadow-sm">
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
