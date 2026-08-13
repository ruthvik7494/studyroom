import Image from 'next/image';

interface HeroSectionV1Props {
  variant?: 'split' | 'full';
  bgCoverUrl?: string;
  cardCoverUrl?: string;
  centreName?: string;
  location?: string;
  rating?: number;
  availSeats?: number;
  totalSeats?: number;
}

export function HeroSectionV1({
  variant = 'split',
  bgCoverUrl,
  cardCoverUrl,
  centreName = "Drishti Women's Study Hall",
  location = 'Hanamkonda',
  rating = 4.9,
  availSeats = 45,
  totalSeats = 60,
}: HeroSectionV1Props) {
  const heroBg = bgCoverUrl || cardCoverUrl || '/images/hero-cover.png';
  const cardImg = cardCoverUrl || bgCoverUrl || '/images/focus-study-room.png';

  if (variant === 'full') {
    return (
      <section className="relative w-full min-h-[540px] md:min-h-[600px] flex items-center overflow-hidden bg-slate-950 text-white py-16 md:py-24 px-6 md:px-16">
        {/* Full-Scale Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity duration-300"
          alt={centreName}
          src={heroBg}
        />
        {/* Gradient Overlay for Readability (Dark on left for text, completely transparent on right for bright image) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/40 to-transparent" />

        <div className="relative z-10 max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Content Aligned to the Left / Right balance */}
          <div className="lg:col-span-8 flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Verified Quiet Study Halls &amp; Reading Rooms
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-['Lexend',sans-serif] leading-tight tracking-tight text-white drop-shadow-md">
              Book Verified Study Desks <br />
              <span className="text-emerald-400">Near You in Seconds.</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-['Inter',sans-serif] max-w-xl leading-relaxed">
              Book high-speed, AC-conditioned reserved desks with guaranteed power sockets, ergonomic seating, and women-safe quiet zones.
            </p>

            <form action="/centres" method="get" className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl p-2 flex items-center border border-white/20 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-400 transition-all mt-1">
              <span className="material-symbols-outlined text-[#006b2c] ml-3 text-xl">location_on</span>
              <input
                name="q"
                className="w-full bg-transparent border-none focus:outline-none text-sm text-[#191c1e] px-3 placeholder-[#565e74]"
                placeholder="Search by area, landmark or study hall name..."
                type="text"
              />
              <button type="submit" className="bg-[#006b2c] text-white font-bold text-xs px-7 py-3 rounded-xl hover:bg-[#00873a] transition-all shadow-md shrink-0">
                Search
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">⚡ Instant Confirmation</span>
              <span className="flex items-center gap-1.5">🛡️ Verified Amenities</span>
              <span className="flex items-center gap-1.5">☕ Free Beverage Bar</span>
            </div>
          </div>

          {/* Floating Card on the Right */}
          <div className="lg:col-span-4 hidden lg:flex flex-col gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-2xl text-white space-y-4 overflow-hidden">
              <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover"
                  alt={centreName}
                  src={cardImg}
                />
                <span className="absolute top-3 right-3 bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full shadow-md">
                  {rating.toFixed(1)} ★
                </span>
              </div>
              <div>
                <h4 className="text-xl font-bold font-['Lexend',sans-serif]">{centreName}</h4>
                <p className="text-xs text-slate-300 mt-1">{location} • {availSeats} / {totalSeats} Seats Available</p>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/10 text-xs text-slate-200">
                <span className="bg-white/10 px-3 py-1.5 rounded-lg">AC</span>
                <span className="bg-white/10 px-3 py-1.5 rounded-lg">WiFi</span>
                <span className="bg-white/10 px-3 py-1.5 rounded-lg">Women-only</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full bg-[#f7f9fb] py-16 md:py-24 px-6 md:px-16 max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <div className="lg:col-span-7 flex flex-col items-start gap-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006b2c]/10 text-[#006b2c] text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-[#006b2c] animate-pulse"></span>
          Verified Quiet Study Halls &amp; Reading Rooms
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#191c1e] font-['Lexend',sans-serif] leading-tight tracking-tight">
          Book Verified Study Desks <br />
          <span className="text-[#006b2c]">Near You in Seconds.</span>
        </h1>
        <p className="text-sm text-[#565e74] font-['Inter',sans-serif] max-w-lg leading-relaxed">
          Book high-speed, AC-conditioned reserved desks with guaranteed power sockets, ergonomic seating, and women-safe quiet zones.
        </p>

        <form action="/centres" method="get" className="w-full max-w-lg bg-white rounded-xl p-2 flex items-center border border-[#e0e3e5] shadow-md focus-within:border-[#006b2c] transition-all mt-1">
          <span className="material-symbols-outlined text-[#006b2c] ml-3 text-xl">location_on</span>
          <input
            name="q"
            className="w-full bg-transparent border-none focus:outline-none text-sm text-[#191c1e] px-3 placeholder-[#565e74]"
            placeholder="Search by area, landmark or study hall name..."
            type="text"
          />
          <button type="submit" className="bg-[#006b2c] text-white font-semibold text-xs px-6 py-2.5 rounded-lg hover:bg-[#00873a] transition-all shadow-sm">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-semibold text-[#565e74]">
          <span className="flex items-center gap-1.5">⚡ Instant Confirmation</span>
          <span className="flex items-center gap-1.5">🛡️ Verified Amenities</span>
          <span className="flex items-center gap-1.5">☕ Free Beverage Bar</span>
        </div>
      </div>

      <div className="lg:col-span-5 relative h-[450px] w-full rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
        <Image
          className="w-full h-full object-cover"
          alt="Sanctuary Study Room"
          src="/images/hero-cover.png"
          fill
        />
        <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/40 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#006b2c]">Drishti Women's Study Hall</p>
            <p className="text-[11px] text-[#565e74]">Hanamkonda • 45 Seats Free</p>
          </div>
          <span className="bg-[#006b2c] text-white text-xs font-bold px-3 py-1.5 rounded-lg">4.9 ★</span>
        </div>
      </div>
    </section>
  );
}
