'use client';

import { useState } from 'react';
import Image from 'next/image';

export function HeroSectionSwitcher() {
  const [variant, setVariant] = useState<'v0' | 'v1' | 'v2' | 'v3'>('v0');

  return (
    <div className="relative w-full">
      {/* Version Selector Bar */}
      <div className="bg-[#191c1e] text-white py-3 px-6 flex items-center justify-between border-b border-[#3e4a3d]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#7ffc97] uppercase tracking-wider">Hero Section Variations:</span>
          <span className="text-xs text-gray-300">Click to preview live design alternatives</span>
        </div>
        <div className="flex items-center gap-2">
          {(['v0', 'v1', 'v2', 'v3'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                variant === v
                  ? 'bg-[#006b2c] text-white shadow-md ring-2 ring-[#7ffc97]'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {v === 'v0' ? 'v0 (Current Stitch)' : v === 'v1' ? 'v1 (Minimalist Light Split)' : v === 'v2' ? 'v2 (Floating Card Grid)' : 'v3 (Warm Organic Focus)'}
            </button>
          ))}
        </div>
      </div>

      {/* VARIANT 0: Current Stitch Glassmorphism */}
      {variant === 'v0' && (
        <section className="relative w-full h-[600px] flex items-center justify-center px-4 md:px-16 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              className="w-full h-full object-cover"
              alt="Innovative Spaces for Modern Focus"
              src="/images/hero-cover.png"
              fill
              priority
            />
            <div className="absolute inset-0 bg-[#f7f9fb]/30 backdrop-blur-[2px]"></div>
          </div>

          <div className="relative z-10 stitch-glass-card p-10 md:p-16 rounded-[24px] max-w-3xl w-full text-center flex flex-col items-center gap-8 shadow-2xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#191c1e] font-['Lexend',sans-serif] tracking-tight leading-tight">
              Innovative Spaces for Modern Focus
            </h1>
            <form action="/centres" method="get" className="w-full max-w-xl bg-white rounded-[16px] p-2 flex items-center border border-[#bdcaba] shadow-sm focus-within:border-[#006b2c] focus-within:ring-2 focus-within:ring-[#006b2c]/20 transition-all">
              <span className="material-symbols-outlined text-[#565e74] ml-4">search</span>
              <input
                name="q"
                className="w-full bg-transparent border-none focus:outline-none text-base text-[#191c1e] px-4 placeholder-[#3e4a3d] font-['Inter',sans-serif]"
                placeholder="Search area or landmark..."
                type="text"
              />
              <button type="submit" className="bg-[#006b2c] text-white font-semibold text-sm px-8 py-3 rounded-xl hover:bg-[#00873a] transition-colors whitespace-nowrap">
                Search
              </button>
            </form>
          </div>
        </section>
      )}

      {/* VARIANT 1: Modern Split Layout with Dual Action Pills */}
      {variant === 'v1' && (
        <section className="relative w-full bg-[#f7f9fb] py-16 md:py-24 px-6 md:px-16 max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006b2c]/10 text-[#006b2c] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006b2c] animate-pulse"></span>
              Verified Quiet Study Halls & Reading Rooms
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
      )}

      {/* VARIANT 2: Premium Clean Floating Search Card */}
      {variant === 'v2' && (
        <section className="relative w-full py-20 px-6 md:px-16 bg-gradient-to-b from-[#eaf4ec] to-[#f7f9fb]">
          <div className="max-w-[1000px] mx-auto text-center flex flex-col items-center gap-6">
            <span className="text-xs font-bold text-[#006b2c] uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-[#006b2c]/20 shadow-sm">
              Premium Academic Coworking Pass
            </span>
            <h1 className="text-4xl sm:text-6xl font-black text-[#191c1e] font-['Lexend',sans-serif] tracking-tight">
              Book Verified Study Desks <br /> Near You in Seconds.
            </h1>
            <p className="text-lg text-[#565e74] max-w-2xl">
              Zero distraction study halls equipped with high-speed fiber internet, silent air-conditioning, and 24/7 biometric security access.
            </p>

            <div className="w-full max-w-3xl bg-white p-4 rounded-[28px] shadow-2xl border border-[#e0e3e5] mt-4">
              <form action="/centres" method="get" className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-8 flex items-center bg-[#f2f4f6] rounded-2xl px-4 py-3 border border-transparent focus-within:border-[#006b2c]">
                  <span className="material-symbols-outlined text-[#565e74]">search</span>
                  <input
                    name="q"
                    className="w-full bg-transparent border-none focus:outline-none text-base text-[#191c1e] px-3 placeholder-[#565e74]"
                    placeholder="Search by area, landmark or study hall name..."
                    type="text"
                  />
                </div>
                <div className="md:col-span-4">
                  <button type="submit" className="w-full bg-[#006b2c] text-white font-bold text-base py-3.5 rounded-2xl hover:bg-[#00873a] transition-all shadow-md flex items-center justify-center gap-2">
                    <span>Search Spaces</span>
                    <span>→</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* VARIANT 3: Warm Organic Dual Card Banner */}
      {variant === 'v3' && (
        <section className="relative w-full bg-[#eceef0] py-16 px-6 md:px-16 border-b border-[#e0e3e5]">
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <span className="text-xs font-extrabold text-[#006b2c] uppercase tracking-wider">Designed for Serious Aspirants</span>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#191c1e] font-['Lexend',sans-serif] leading-tight">
                Focus Without Interruptions. <br />
                Reserve Your Study Space Today.
              </h1>
              <p className="text-base text-[#565e74]">
                Choose from over 15+ verified quiet study halls across Hanamkonda & Warangal. Monthly, daily, and hourly passes available.
              </p>

              <div className="bg-white p-3 rounded-2xl border border-[#bdcaba] shadow-md flex items-center gap-3 max-w-lg">
                <input
                  name="q"
                  className="w-full bg-transparent border-none focus:outline-none text-sm text-[#191c1e] px-3 placeholder-[#565e74]"
                  placeholder="Where do you want to study?"
                  type="text"
                />
                <button className="bg-[#006b2c] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#00873a] transition-colors whitespace-nowrap">
                  Explore
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                <Image className="w-full h-full object-cover" alt="Study space 1" src="/images/hero-cover.png" fill />
              </div>
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white mt-8">
                <Image className="w-full h-full object-cover" alt="Study space 2" src="https://picsum.photos/seed/study2/600/600" fill unoptimized />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
