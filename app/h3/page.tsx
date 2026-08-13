import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { listCentres } from '@/features/centres/services/centres.service';
import { getServiceArea } from '@/lib/service-area';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Theme 3 — Neo-Brutalist Bold & Dynamic Vibrant', ...noindex };

export default async function Theme3Page() {
  const db = await createClient();
  const [{ items: featured }, serviceArea] = await Promise.all([
    listCentres(db, { limit: 6 }),
    getServiceArea(db),
  ]);

  return (
    <div className="min-h-screen bg-amber-50 text-slate-950 font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Banner Notice */}
      <div className="bg-slate-950 text-amber-300 py-2.5 text-center text-xs font-black uppercase tracking-widest border-b-4 border-slate-950">
        🚀 Theme Preview 3: Bold Neo-Brutalist & High-Energy Slate Nook
      </div>

      {/* Hero Section */}
      <section className="px-6 py-20 lg:py-28 border-b-4 border-slate-950 bg-yellow-400">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-block bg-slate-950 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            🔥 Warangal's #1 Study Space Network
          </span>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-950 tracking-tight leading-none uppercase">
            BOOK YOUR DESK.<br/><span className="bg-rose-500 text-white px-3 py-1 inline-block rotate-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-2">CRACK THE EXAM.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-bold text-slate-900 leading-snug">
            Compare prices, check live AC seat availability, and lock in your monthly reading spot instantly.
          </p>

          <form action="/centres" method="get" className="mx-auto mt-10 max-w-2xl flex flex-col sm:flex-row gap-3">
            <input
              name="q"
              type="text"
              placeholder="Search Hanamkonda, Kazipet or Hall name..."
              className="h-16 flex-1 rounded-xl bg-white px-5 text-slate-950 font-bold border-4 border-slate-950 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-amber-50 placeholder:text-slate-500"
            />
            <button type="submit" className="h-16 px-8 rounded-xl bg-rose-500 font-black text-white border-4 border-slate-950 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all uppercase text-base">
              FIND SEAT NOW
            </button>
          </form>
        </div>
      </section>

      {/* Featured Spaces */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl font-black uppercase tracking-tight text-slate-950">POPULAR STUDY HALLS</h2>
          <Link href="/centres" className="bg-slate-950 text-white font-black text-xs uppercase px-4 py-2 rounded border-2 border-slate-950 hover:bg-rose-500 transition">
            Browse All →
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((centre) => (
            <div key={centre.id} className="rounded-2xl bg-white border-4 border-slate-950 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition">
              <div className="relative h-48 w-full rounded-xl overflow-hidden border-2 border-slate-950 bg-slate-200">
                {centre.coverUrl && <Image src={centre.coverUrl} alt={centre.name} fill className="object-cover" />}
                <span className="absolute top-2 right-2 rounded bg-yellow-400 border-2 border-slate-950 px-2 py-0.5 text-xs font-black">
                  ★ {centre.rating.toFixed(1)}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-black text-slate-950">{centre.name}</h3>
                <p className="text-xs font-bold text-slate-600 mt-1">📍 {centre.area}</p>
                <div className="mt-4 flex items-center justify-between pt-4 border-t-2 border-slate-200">
                  <span className="text-base font-black text-rose-600">₹1,200/mo</span>
                  <Link href={`/centres/${centre.slug}`} className="px-4 py-2 text-xs font-black rounded bg-slate-950 text-white hover:bg-rose-500 transition border-2 border-slate-950 uppercase">
                    BOOK SEAT
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
