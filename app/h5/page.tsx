import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { listCentres } from '@/features/centres/services/centres.service';
import { getServiceArea } from '@/lib/service-area';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Theme 5 — Executive Premium Coworking Light', ...noindex };

export default async function Theme5Page() {
  const db = await createClient();
  const [{ items: featured }, serviceArea] = await Promise.all([
    listCentres(db, { limit: 6 }),
    getServiceArea(db),
  ]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Top Banner Notice */}
      <div className="bg-emerald-900 text-emerald-200 py-2.5 text-center text-xs font-semibold tracking-wide">
        🌿 Theme Preview 5: Executive Modern Workspace (Inspired by Corporate Coworking Design)
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-600/20">
              S
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Study<span className="text-emerald-600">Nook</span></span>
          </div>
          <div className="hidden md:flex items-center gap-9 text-sm font-semibold text-slate-600">
            <Link href="/centres" className="hover:text-emerald-600 transition">Find Spaces</Link>
            <Link href="/about" className="hover:text-emerald-600 transition">Why Us</Link>
            <Link href="/contact" className="hover:text-emerald-600 transition">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20">
              Book a Space
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION - Full Bleed Dark Interior with Bold Emerald Highlight */}
      <section className="relative min-h-[580px] bg-slate-950 text-white overflow-hidden flex items-center">
        <div className="absolute inset-0 opacity-40">
          <Image src="https://picsum.photos/seed/hero-cowork/1600/900" alt="Workspace" fill className="object-cover" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-block text-emerald-400 font-bold text-xs uppercase tracking-widest bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-md mb-6">
              Co-Study & Premium Reading Rooms
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              Innovative <span className="text-emerald-400 underline decoration-emerald-500 underline-offset-8">Spaces</span><br/> For Modern Focus.
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
              Elevate your exam preparation and daily productivity in quiet, climate-controlled study halls across {serviceArea.city || 'Warangal'}.
            </p>

            {/* Search Box */}
            <form action="/centres" method="get" className="mt-10 bg-white/95 backdrop-blur-xl p-2.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2">
              <input
                name="q"
                type="text"
                placeholder="Search area, landmark or study hall..."
                className="h-14 flex-1 rounded-xl bg-slate-50 px-5 text-slate-900 font-medium placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
              <button type="submit" className="h-14 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white transition text-sm shadow-lg shadow-emerald-600/30">
                Explore Spaces →
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* BENEFIT ICONS - 5 Column Feature Bar */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Designed for Concentration</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">The Benefits That Will Make You Succeed</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { icon: '⚡', title: 'High-Speed Wi-Fi', desc: '100 Mbps Dedicated Line' },
              { icon: '🌙', title: '24/7 Access', desc: 'Night Owl Friendly' },
              { icon: '❄️', title: 'Full AC Climate', desc: 'Optimal Room Temp' },
              { icon: '🛡️', title: 'Women-Safe', desc: 'CCTV & Guarded' },
              { icon: '☕', title: 'Pantry & Coffee', desc: 'Unlimited Refreshments' },
            ].map((b, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center hover:border-emerald-500/50 hover:shadow-lg transition group">
                <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-50 text-emerald-600 text-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  {b.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-base">{b.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED SPACES - Clean 3-Card Grid */}
      <section className="py-20 mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Top Rated Locations</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Our Featured Study Spaces</h2>
          </div>
          <Link href="/centres" className="mt-4 md:mt-0 font-bold text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All 6+ Centres <span>→</span>
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((centre) => (
            <div key={centre.id} className="group rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col">
              <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
                {centre.cover_url && <Image src={centre.cover_url} alt={centre.name} fill className="object-cover group-hover:scale-105 transition duration-700" />}
                <div className="absolute top-4 left-4 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                  {centre.space_type?.replace('_', ' ').toUpperCase() || 'STUDY HALL'}
                </div>
                <div className="absolute top-4 right-4 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-900 shadow-md">
                  ★ {centre.rating.toFixed(1)}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition">{centre.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span>📍</span> {centre.area}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">Monthly Plan</span>
                    <span className="text-lg font-extrabold text-slate-900">₹1,200 <span className="text-xs font-normal text-slate-500">/mo</span></span>
                  </div>
                  <Link href={`/centres/${centre.slug}`} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20">
                    Book Desk
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS COUNTER BAR */}
      <section className="bg-emerald-600 text-white py-16 px-6">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <span className="text-4xl font-extrabold block">1,200+</span>
            <span className="text-xs font-medium text-emerald-100 mt-1 block">Active Desk Seats</span>
          </div>
          <div>
            <span className="text-4xl font-extrabold block">15+</span>
            <span className="text-xs font-medium text-emerald-100 mt-1 block">Verified Locations</span>
          </div>
          <div>
            <span className="text-4xl font-extrabold block">4.9★</span>
            <span className="text-xs font-medium text-emerald-100 mt-1 block">Student Rating</span>
          </div>
          <div>
            <span className="text-4xl font-extrabold block">100%</span>
            <span className="text-xs font-medium text-emerald-100 mt-1 block">Guaranteed Quiet</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white py-12 px-6 border-t border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center text-sm text-slate-400 gap-4">
          <div>© 2026 StudyNook Inc. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
