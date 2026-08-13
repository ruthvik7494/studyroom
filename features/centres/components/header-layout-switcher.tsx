'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LayoutSwitcherProps {
  centre: any;
  fullAddress: string;
  schedule: any;
  todayOpen: boolean | null;
  totalSeats: number;
  social: any;
}

export function HeaderLayoutSwitcher({
  centre,
  fullAddress,
  schedule,
  todayOpen,
  totalSeats,
  social,
}: LayoutSwitcherProps) {
  const [activeLayout, setActiveLayout] = useState<'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5'>('v0');

  const layouts = [
    { id: 'v0', label: 'V0 (Default Card)' },
    { id: 'v1', label: 'V1 (Left Accent Bar)' },
    { id: 'v2', label: 'V2 (Glassmorphism Banner)' },
    { id: 'v3', label: 'V3 (Executive Dark)' },
    { id: 'v4', label: 'V4 (Pill Badges)' },
    { id: 'v5', label: 'V5 (Metric Grid Tiles)' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Layout Selector Bar (Hidden on nittala-ruthvik) */}
      {centre.slug !== 'nittala-ruthvik' && (
        <div className="relative z-20 mx-auto max-w-6xl px-6 pt-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-lg">
            <span className="px-2 text-xs font-bold uppercase tracking-wider text-slate-400">Layout Preview:</span>
            {layouts.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLayout(l.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                  activeLayout === l.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Render Active Layout */}
      {activeLayout === 'v0' && (
        <div className="relative z-10 -mt-14 rounded-2xl border bg-card p-4 shadow-md sm:-mt-16 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {centre.logo_url ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm sm:h-24 sm:w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={centre.logo_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border bg-secondary text-4xl sm:h-24 sm:w-24" aria-hidden>{centre.emoji}</span>
            )}

            <div className="min-w-0 flex-1">
              {centre.is_verified && (
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <svg aria-hidden viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Zm-1.2 13.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3Z" /></svg>
                  Verified Centre
                </span>
              )}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <h1 className="min-w-0 break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">{centre.name}</h1>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-600">
                  <span aria-hidden>★</span>{centre.rating.toFixed(1)}
                  <span className="font-medium text-muted-foreground">({centre.reviews_count} reviews)</span>
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <span aria-hidden>📍</span>{fullAddress || centre.area}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                {schedule && (
                  <span className={cn('inline-flex items-center gap-1.5 font-semibold', todayOpen ? 'text-primary' : 'text-destructive')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', todayOpen ? 'bg-primary' : 'bg-destructive')} aria-hidden />
                    {todayOpen ? 'Open Now' : 'Closed Now'}
                  </span>
                )}
                {centre.occupancy && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span aria-hidden>👤</span>{centre.occupancy.seatsFree} Seats Available</span>
                )}
                {totalSeats > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span aria-hidden>👥</span>{totalSeats} Total Seats</span>
                )}
                {centre.women_safe_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-700">🛡 Women-safe</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4">
            {centre.phone && (
              <a href={`tel:${centre.phone}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold hover:bg-secondary">
                <span aria-hidden>📞</span> Call
              </a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#25D366]/40 py-2 text-sm font-semibold text-[#128C36] hover:bg-[#25D366]/5">
                <span aria-hidden>💬</span> WhatsApp
              </a>
            )}
            {centre.lat != null && centre.lng != null && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${centre.lat},${centre.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold hover:bg-secondary"
              >
                <span aria-hidden>🧭</span> Directions
              </a>
            )}
            {centre.website && (
              <a href={centre.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold hover:bg-secondary">
                <span aria-hidden>🌐</span> Website
              </a>
            )}
          </div>
        </div>
      )}

      {/* V1 Layout: Modern Split Card with Left Accent Bar */}
      {activeLayout === 'v1' && (
        <div className="relative z-10 -mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-16 w-1.5 shrink-0 rounded-full bg-emerald-600" />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-['Lexend',sans-serif] text-2xl font-bold text-slate-900 sm:text-3xl">{centre.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    ★ {centre.rating.toFixed(1)} <span className="font-normal text-slate-500">({centre.reviews_count} reviews)</span>
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-slate-600">
                  📍 {fullAddress || centre.area}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className={cn('flex items-center gap-1 rounded-md border px-2.5 py-1 font-semibold', todayOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', todayOpen ? 'bg-emerald-600' : 'bg-rose-600')} /> {todayOpen ? 'Open Now' : 'Closed Now'}
                  </span>
                  {centre.occupancy && (
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">👤 {centre.occupancy.seatsFree} Available</span>
                  )}
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">👥 {totalSeats} Total</span>
                  {centre.women_safe_verified && (
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">🛡 Women-safe</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-2 md:pt-0">
              {centre.phone && (
                <a href={`tel:${centre.phone}`} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200">
                  📞 Call
                </a>
              )}
              {social.whatsapp && (
                <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-2 text-xs font-bold text-[#128C36] transition-colors hover:bg-[#25D366]/20">
                  💬 WhatsApp
                </a>
              )}
              {centre.website && (
                <a href={centre.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800">
                  🌐 Website
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* V2 Layout: Glassmorphism Floating Banner */}
      {activeLayout === 'v2' && (
        <div className="relative z-10 -mt-10 space-y-4 rounded-3xl border border-white/40 bg-white/85 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-['Lexend',sans-serif] text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{centre.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                📍 {fullAddress || centre.area}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/20 px-3.5 py-1.5">
              <span className="text-sm font-bold text-amber-700">★ {centre.rating.toFixed(1)}</span>
              <span className="text-xs font-medium text-slate-700">({centre.reviews_count} reviews)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/60 bg-slate-50/80 p-2.5 text-center text-xs sm:grid-cols-4">
            <div className={cn('rounded-xl p-1.5 font-semibold shadow-2xs', todayOpen ? 'bg-white text-emerald-700' : 'bg-white text-rose-600')}>
              {todayOpen ? '🟢 Open Now' : '🔴 Closed Now'}
            </div>
            <div className="rounded-xl bg-white p-1.5 text-slate-700 shadow-2xs">👤 {centre.occupancy?.seatsFree ?? 0} Free</div>
            <div className="rounded-xl bg-white p-1.5 text-slate-700 shadow-2xs">👥 {totalSeats} Total</div>
            <div className="rounded-xl bg-white p-1.5 font-bold text-emerald-700 shadow-2xs">🛡 Women-safe</div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {centre.phone && (
              <a href={`tel:${centre.phone}`} className="flex justify-center items-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50">📞 Call</a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100">💬 WhatsApp</a>
            )}
            {centre.website && (
              <a href={centre.website} target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800">🌐 Website</a>
            )}
          </div>
        </div>
      )}

      {/* V3 Layout: Executive Compact Dark */}
      {activeLayout === 'v3' && (
        <div className="relative z-10 -mt-10 space-y-4 rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-['Lexend',sans-serif] text-xl font-bold sm:text-2xl">{centre.name}</h1>
                {centre.women_safe_verified && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">🛡 Women-safe</span>
                )}
              </div>
              <p className="text-xs text-slate-400">📍 {fullAddress || centre.area}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-extrabold text-amber-400">★ {centre.rating.toFixed(1)}</div>
              <div className="text-[10px] text-slate-400">{centre.reviews_count} reviews</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-300">
              <span className={cn('flex items-center gap-1.5 font-semibold', todayOpen ? 'text-emerald-400' : 'text-rose-400')}>
                <span className={cn('h-2 w-2 rounded-full animate-pulse', todayOpen ? 'bg-emerald-500' : 'bg-rose-500')} />
                {todayOpen ? 'Open Now' : 'Closed Now'}
              </span>
              <span>👤 <strong className="text-white">{centre.occupancy?.seatsFree ?? 0}</strong> Available</span>
              <span>👥 <strong className="text-white">{totalSeats}</strong> Seats</span>
            </div>

            <div className="flex items-center gap-2">
              {centre.phone && (
                <a href={`tel:${centre.phone}`} className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700">Call</a>
              )}
              {social.whatsapp && (
                <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-[#20bd5a]">WhatsApp</a>
              )}
              {centre.website && (
                <a href={centre.website} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100">Website →</a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* V4 Layout: Pill Badges & Friendly Rounded Design */}
      {activeLayout === 'v4' && (
        <div className="relative z-10 -mt-10 space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-['Lexend',sans-serif] text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{centre.name}</h1>
              <p className="mt-0.5 text-xs text-slate-500">📍 {fullAddress || centre.area}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm">
              <span className="font-bold text-amber-600">★ {centre.rating.toFixed(1)}</span>
              <span className="text-xs text-slate-500">({centre.reviews_count} reviews)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
            <span className={cn('rounded-full px-3 py-1.5', todayOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
              {todayOpen ? '🟢 Open Now' : '🔴 Closed Now'}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">👤 {centre.occupancy?.seatsFree ?? 0} Available</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">👥 {totalSeats} Total Seats</span>
            {centre.women_safe_verified && (
              <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-purple-800">🛡 Women-safe</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {centre.phone && (
              <a href={`tel:${centre.phone}`} className="flex-1 rounded-2xl bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200">📞 Call Us</a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/15 py-2.5 text-center text-xs font-bold text-[#128C36] transition-colors hover:bg-[#25D366]/25">💬 Chat on WhatsApp</a>
            )}
            {centre.website && (
              <a href={centre.website} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-2xl bg-emerald-700 py-2.5 text-center text-xs font-bold text-white transition-colors hover:bg-emerald-800">🌐 Visit Website</a>
            )}
          </div>
        </div>
      )}

      {/* V5 Layout: Dashboard Metric Tiles */}
      {activeLayout === 'v5' && (
        <div className="relative z-10 -mt-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Lexend',sans-serif] text-2xl font-bold text-slate-900">{centre.name}</h1>
                {centre.women_safe_verified && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">Women-safe</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">📍 {fullAddress || centre.area}</p>
            </div>
            {centre.website && (
              <a href={centre.website} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Website →</a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Rating</span>
              <span className="text-lg font-extrabold text-amber-600">★ {centre.rating.toFixed(1)} <span className="text-xs font-normal text-slate-500">({centre.reviews_count})</span></span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</span>
              <span className={cn('text-sm font-bold', todayOpen ? 'text-emerald-700' : 'text-rose-600')}>{todayOpen ? 'Open Now' : 'Closed Now'}</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Seats Free</span>
              <span className="text-lg font-extrabold text-emerald-700">{centre.occupancy?.seatsFree ?? 0} <span className="text-xs font-normal text-slate-500">/ {totalSeats}</span></span>
            </div>

            <div className="flex items-center justify-around rounded-xl border border-slate-100 bg-slate-50 p-3">
              {centre.phone && (
                <a href={`tel:${centre.phone}`} className="rounded-lg border bg-white p-2 text-xs font-bold text-slate-700 hover:bg-slate-100">📞 Call</a>
              )}
              {social.whatsapp && (
                <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs font-bold text-emerald-700">💬 Chat</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
