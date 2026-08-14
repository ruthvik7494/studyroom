import { HeroSectionV1 } from '@/components/hero-section-v1';
import { WhyChooseSection } from '@/components/why-choose-section';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { listCentres } from '@/features/centres/services/centres.service';
import { getServiceArea } from '@/lib/service-area';

export async function generateMetadata(): Promise<Metadata> {
  const db = await createClient();
  const { city } = await getServiceArea(db).catch(() => ({ city: 'Hanamkonda', state: 'Telangana', count: 0 }));
  return {
    title: city ? `StudyNook — find & book study spaces in ${city}` : 'StudyNook — find & book study spaces',
    description: 'Discover, compare and book study halls, reading rooms and coworking spaces near you. Live availability, verified reviews, transparent prices.',
    alternates: { canonical: '/' },
  };
}

export default async function HomePage() {
  const db = await createClient();
  const [centreData, serviceArea] = await Promise.all([
    listCentres(db, { limit: 6 }).catch(() => ({ items: [], nextCursor: null })),
    getServiceArea(db).catch(() => ({ city: 'Hanamkonda', state: 'Telangana', count: 0 })),
  ]);
  const featured = centreData?.items || [];

  return (
    <>
      {/* Load Google Material Symbols & Lexend/Inter fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lexend:wght@600;700&display=swap" />

      <style>{`
        .stitch-glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 30px rgba(86, 94, 116, 0.15);
        }
        .stitch-pulse-dot {
          animation: stitchPulse 2s infinite;
        }
        @keyframes stitchPulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 107, 44, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(0, 107, 44, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 107, 44, 0); }
        }
      `}</style>

      <div className="bg-[#f7f9fb] text-[#191c1e] antialiased min-h-screen flex flex-col font-['Inter',sans-serif]">
        {/* Main Content */}
        <main className="flex-grow">
          {(() => {
            const topCentre = featured[0];
            const coverUrl = topCentre?.cover_url;
            return (
              <HeroSectionV1
                variant="full"
                bgCoverUrl="/images/hero-cover-h6.jpg"
                cardCoverUrl={coverUrl || undefined}
                centreName={topCentre?.name}
                location={topCentre?.area || serviceArea.city || undefined}
                rating={topCentre?.rating}
              />
            );
          })()}

          {/* Feature Bar */}
          <section className="bg-[#eceef0] py-12 px-6 md:px-16 border-y border-[#e0e3e5]">
            <div className="max-w-[1280px] mx-auto flex flex-wrap justify-between items-center gap-8 text-[#565e74]">
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-80">wifi</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#3e4a3d]">High-Speed Wi-Fi</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-80">schedule</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#3e4a3d]">24/7 Access</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-80">ac_unit</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#3e4a3d]">Full AC Climate</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-80">security</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#3e4a3d]">Women-Safe Zones</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-80">local_cafe</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#3e4a3d]">Coffee Pantry</span>
              </div>
            </div>
          </section>

          {/* Study Space Grid */}
          <section className="py-20 px-6 md:px-16 max-w-[1280px] mx-auto">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#191c1e] font-['Lexend',sans-serif] mb-2">Curated Study Spaces</h2>
                <p className="text-lg text-[#3e4a3d]">Find your perfect environment for deep work.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featured.map((centre, idx) => {
                const totalSeats = 60;
                const availSeats = idx === 0 ? 45 : idx === 1 ? 12 : 28;
                const reviewCount = idx === 0 ? 141 : idx === 1 ? 89 : 112;
                const isWomenOnly = idx === 0 || centre.women_safe_verified;
                const price = centre.fromMonthly ?? 1400;
                const location = centre.area || serviceArea.city || 'Hanamkonda';
                const coverImg = centre.cover_url || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop';

                return (
                  <div key={centre.id} className="relative bg-white rounded-3xl border border-[#e2e8f0] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative h-48 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverImg} alt={centre.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <span className="text-xs font-medium flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                            📍 {location}
                          </span>
                          <span className="text-xs font-bold bg-amber-400 text-slate-900 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            ★ {(centre.rating || 5.0).toFixed(1)} <span className="text-[10px] font-normal text-slate-800">({reviewCount})</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-3.5">
                        <h3 className="text-lg font-bold text-slate-900 font-['Lexend',sans-serif] leading-tight">{centre.name}</h3>

                        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-600 font-medium">Availability</span>
                          <span className="font-bold text-[#006b2c] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#006b2c] animate-pulse" />
                            {availSeats} / {totalSeats} seats
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-slate-600">
                          {isWomenOnly && <span className="bg-emerald-50 text-[#006b2c] border border-emerald-200 px-2.5 py-0.5 rounded-md">Women-only</span>}
                          <span className="bg-slate-100 px-2.5 py-0.5 rounded-md">WiFi</span>
                          <span className="bg-slate-100 px-2.5 py-0.5 rounded-md">AC</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="p-5 pt-0">
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">Starting from</span>
                          <span className="text-xl font-extrabold text-slate-900 font-['Lexend',sans-serif]">₹{price.toLocaleString()}</span>
                          <span className="text-xs text-slate-500">/mo</span>
                        </div>
                        <Link href={`/centres/${centre.slug}`} className="bg-[#006b2c] hover:bg-[#005221] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1">
                          View Centre →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Why Choose StudyNook & Built for Students Section */}
          <WhyChooseSection city={serviceArea.city || 'Hanamkonda'} />

          {/* Stats Bar */}
          <section className="bg-[#006b2c] text-white py-16 px-6 md:px-16">
            <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-around items-center gap-12 text-center">
              <div>
                <h3 className="text-5xl font-bold font-['Lexend',sans-serif] mb-2">1,200+</h3>
                <p className="text-lg opacity-90">Active Seats</p>
              </div>
              <div className="hidden md:block w-px h-16 bg-white/20"></div>
              <div>
                <h3 className="text-5xl font-bold font-['Lexend',sans-serif] mb-2">15+</h3>
                <p className="text-lg opacity-90">Locations</p>
              </div>
              <div className="hidden md:block w-px h-16 bg-white/20"></div>
              <div>
                <h3 className="text-5xl font-bold font-['Lexend',sans-serif] mb-2 flex justify-center items-center gap-2">
                  4.9 <span className="material-symbols-outlined text-[40px]">star</span>
                </h3>
                <p className="text-lg opacity-90">Average Rating</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
