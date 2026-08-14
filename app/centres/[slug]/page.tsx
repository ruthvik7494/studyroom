import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { BookingSidebar } from '@/features/centres/components/booking-sidebar';
import { getCentreBySlug, getCentreReviews } from '@/features/centres/services/centres.service';
import { getSessionUser } from '@/lib/auth/rbac';
import { centreJsonLd, breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR, cn } from '@/lib/utils';
import { EnquiryForm } from '@/features/enquiries/components/enquiry-form';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { ReportReviewButton } from '@/features/reviews/components/report-review-button';
import { SaveButton } from '@/features/saved/components/save-button';
import { ClaimForm } from '@/features/claims/components/claim-form';
import { ShareButton } from '@/features/centres/components/share-button';
import { GalleryLightbox } from '@/features/centres/components/gallery-lightbox';
import { SocialIcon, type SocialPlatform } from '@/features/centres/components/social-icon';
import { PricingTabs } from '@/features/centres/components/pricing-tabs';
import { PricingSyncProvider } from '@/features/centres/components/pricing-sync';
import { CentreCard } from '@/features/centres/components/centre-card';
import { DetailSectionCard } from '@/features/centres/components/detail-section-card';
import { OpeningHoursCard } from '@/features/centres/components/opening-hours-card';
import { HeaderLayoutSwitcher } from '@/features/centres/components/header-layout-switcher';
import { PERIOD_LABEL, priceForPeriod, availablePeriods } from '@/features/bookings/pricing';
import { isSaved } from '@/features/saved/services/saved.service';

/** Returns either an external image URL or a Supabase Storage URL. */
const galleryUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studynook.app';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const SPACE_TYPE_LABEL: Record<string, { label: string; icon: string }> = {
  study_hall: { label: 'Study Hall', icon: '📖' },
  reading_room: { label: 'Reading Room', icon: '📚' },
  coworking: { label: 'Coworking', icon: '💼' },
  both: { label: 'Study + Coworking', icon: '🏢' },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadCentre(slug: string) {
  const db = await createClient();
  return getCentreBySlug(db, slug); // RLS: only approved, or owner/admin, is returned
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const centre = await loadCentre(slug);
  if (!centre) return { title: 'Not found' };

  const isPublic = centre.status === 'approved';
  const desc = centre.area
    ? `${centre.name} in ${centre.area} — live availability, ${centre.reviews_count} reviews, rated ${centre.rating}/5.`
    : `${centre.name} — live availability, ${centre.reviews_count} reviews, rated ${centre.rating}/5.`;
  return {
    title: centre.name,
    description: desc,
    alternates: { canonical: `/centres/${centre.slug}` },
    openGraph: { title: centre.name, description: desc, type: 'website' },
    robots: isPublic ? undefined : { index: false, follow: false },
  };
}


export default async function CentreDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const centre = await loadCentre(slug);
  if (!centre) notFound();

  const db = await createClient();
  const [reviews, viewer, { data: weeklyHours }] = await Promise.all([
    getCentreReviews(db, centre.id),
    getSessionUser(),
    db.from('centre_hours').select('day_of_week, is_open, opening_time, closing_time').eq('centre_id', centre.id),
  ]);
  const studentsCount = 500;
  const saved = viewer ? await isSaved(db, viewer.id, centre.id) : false;

  const isPublic = centre.status === 'approved';
  const canPreview = !isPublic && (viewer?.id === centre.owner_id || viewer?.role === 'admin');
  const { data: ownerProfile } = centre.owner_id
    ? await admin.from('profiles').select('full_name, avatar_url, bio, phone, public_email').eq('id', centre.owner_id).maybeSingle()
    : { data: null };

  // Weekly opening hours — built from the real per-day schedule the owner
  // set while creating/editing their listing (features/centres/schema.ts's
  // `hours` field). A centre with no rows at all hasn't configured this yet.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const todayDow = nowIst.getUTCDay(); // shifted-by-offset Date read via UTC getters = IST wall-clock day
  const nowMinutes = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes();

  const fmtTime = (t: string) => {
    const [hStr, mStr] = t.split(':');
    const h = Number(hStr), m = Number(mStr ?? 0);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Monday-first display order, matching the reference design.
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const schedule = weeklyHours && weeklyHours.length > 0
    ? DISPLAY_ORDER.map((dow) => {
        const row = weeklyHours.find((h) => h.day_of_week === dow);
        const isOpen = row?.is_open ?? false;
        const is24h = !!row && row.opening_time === '00:00:00' && (row.closing_time === '23:59:00' || row.closing_time === '00:00:00');
        return {
          label: DOW_LABELS[dow]!,
          isOpen,
          is24h,
          text: !isOpen ? 'Closed' : row?.opening_time && row?.closing_time ? `${fmtTime(row.opening_time)} – ${fmtTime(row.closing_time)}` : 'Closed',
          isToday: dow === todayDow,
        };
      })
    : null;

  let todayOpen: boolean | null = null;
  let todayText = '';
  if (schedule) {
    const today = schedule.find((d) => d.isToday)!;
    todayText = today.is24h ? 'Open 24h' : today.text;
    if (!today.isOpen) {
      todayOpen = false;
    } else if (today.is24h) {
      todayOpen = true;
    } else {
      const row = weeklyHours!.find((h) => h.day_of_week === todayDow)!;
      const [oh = 0, om = 0] = row.opening_time!.split(':').map(Number);
      const [ch = 0, cm = 0] = row.closing_time!.split(':').map(Number);
      const openMin = oh * 60 + om, closeMin = ch * 60 + cm;
      todayOpen = closeMin > openMin ? nowMinutes >= openMin && nowMinutes < closeMin : nowMinutes >= openMin || nowMinutes < closeMin;
    }
  }
  const nowLabel = nowIst.toLocaleString('en-IN', {
    timeZone: 'UTC', // nowIst is already shifted; format its UTC fields as wall-clock IST
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });

  const spaceType = SPACE_TYPE_LABEL[centre.space_type] ?? SPACE_TYPE_LABEL.study_hall!;
  const totalSeats = centre.resources.reduce((sum, r) => sum + (r.unit_count ?? 0), 0);
  const fullAddress = [centre.address, centre.city, centre.state, centre.postcode, centre.country].filter(Boolean).join(', ');
  const pageUrl = `${SITE_URL}/centres/${centre.slug}`;

  // Today's Seat Availability — real hourly capacity from the same function
  // that powers the booking page's slot picker, grouped into 3-hour blocks
  // for a quick-glance view (not a separate, invented data source).
  const todayISODate = nowIst.toISOString().slice(0, 10);
  const primaryResource = centre.resources[0];
  const todayBlocks: { label: string; seatsFree: number; capacity: number; isPast: boolean }[] = [];
  if (primaryResource) {
    const { data: todaySlots } = await db.rpc('resource_hour_slots', { p_resource_id: primaryResource.id, p_date: todayISODate, p_period: 'hour' });
    const fmtH = (h: number) => { const p = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12} ${p}`; };
    const slots = todaySlots ?? [];
    for (let i = 0; i < slots.length; i += 3) {
      const chunk = slots.slice(i, i + 3);
      if (chunk.length === 0) continue;
      const startH = chunk[0]!.hour;
      const endH = chunk[chunk.length - 1]!.hour + 1;
      const capacity = chunk[0]!.capacity;
      const seatsFree = Math.max(0, Math.min(...chunk.map((s) => s.capacity - s.taken)));
      todayBlocks.push({ label: `${fmtH(startH)} - ${fmtH(endH === 24 ? 0 : endH)}`, seatsFree, capacity, isPast: chunk.every((s) => s.is_past) });
    }
  }

  const social = (centre.social ?? {}) as Record<string, string>;
  const socialLinks: [string, string, SocialPlatform][] = [
    ['Facebook', social.facebook, 'facebook'], ['Instagram', social.instagram, 'instagram'], ['YouTube', social.youtube, 'youtube'],
    ['LinkedIn', social.linkedin, 'linkedin'], ['X (Twitter)', social.twitter, 'twitter'], ['WhatsApp', social.whatsapp, 'whatsapp'],
    ['Google Business', social.googleBusiness, 'googleBusiness'],
  ].filter(([, url]) => !!url) as [string, string, SocialPlatform][];

  const jsonLd = [
    centreJsonLd(centre),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Study spaces', path: '/centres' },
      { name: centre.name, path: `/centres/${centre.slug}` },
    ]),
  ];

  return (
    <main className="bg-[#f7f9fb] text-[#191c1e] min-h-screen antialiased selection:bg-[#16a34a]/20 selection:text-[#16a34a]">
      {isPublic && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      )}

      {/* Single Cover Pic Hero Banner (Blurred Glassmorphism Background + Centered Original Foreground) */}
      <div className="relative w-full overflow-hidden bg-slate-900 h-[280px] sm:h-[380px] flex items-center justify-center">
        {centre.cover_url ? (
          <>
            {/* Stretched & subtle blurred background image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={centre.cover_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-75 pointer-events-none"
            />
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xs pointer-events-none" />

            {/* Original uncropped image centered in foreground */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={centre.cover_url}
              alt={`${centre.name} cover photo`}
              className="relative z-10 max-h-full max-w-full object-contain shadow-2xl"
            />
          </>
        ) : (
          <span className="flex h-[260px] w-full items-center justify-center text-8xl sm:h-[340px]" aria-hidden>{centre.emoji}</span>
        )}
        {centre.gallery.length > 0 && (
          <a href="#gallery" className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-black/80 shadow-md transition-all">
            <span aria-hidden>📷</span> View all {centre.gallery.length} photos
          </a>
        )}
      </div>

      {/* Sticky Executive Navigation Bar (Placed AFTER Cover Pic) */}
      <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-y border-[#e0e3e5] shadow-xs mt-6">
        <div className="flex justify-between items-center px-4 md:px-8 py-3.5 max-w-7xl mx-auto">
          <div className="font-['Lexend',sans-serif] text-lg font-bold text-[#191c1e] tracking-tight uppercase flex items-center gap-2">
            <span>{centre.name}</span>
            {centre.is_verified && (
              <span className="text-[10px] font-extrabold bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/20 px-2 py-0.5 rounded-full normal-case">
                ✓ Verified
              </span>
            )}
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-[#565e74]">
            <a className="hover:text-[#16a34a] transition-colors" href="#about">About</a>
            <a className="hover:text-[#16a34a] transition-colors" href="#spaces">Spaces</a>
            <a className="hover:text-[#16a34a] transition-colors" href="#facilities">Facilities</a>
            <a className="hover:text-[#16a34a] transition-colors" href="#pricing">Pricing</a>
            <a className="hover:text-[#16a34a] transition-colors" href="#gallery">Gallery</a>
            <a className="hover:text-[#16a34a] transition-colors" href="#reviews">Reviews</a>
            <a className="hover:text-[#16a34a] transition-colors" href="#contact">Contact</a>
          </div>

          <div className="flex items-center gap-4">
            {centre.phone && (
              <a href={`tel:${centre.phone}`} className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#565e74] hover:text-[#191c1e]">
                <span>📞</span> {centre.phone}
              </a>
            )}
            <Link href={`/centres/${centre.slug}/book`} className="bg-[#16a34a] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-[#15803d] transition-all shadow-xs">
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {canPreview && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 flex items-center justify-between" role="status">
            <span>⚠️ Preview Mode — Listing is <strong>{centre.status.replace('_', ' ')}</strong> and hidden from the public.</span>
            <Link href={`/owner/centres/${centre.id}`} className="underline">Edit Listing</Link>
          </div>
        )}

        {/* Main 2-Column Content Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Main Column */}
          <div className="lg:col-span-2 space-y-12">
            {/* Title & Metadata Header */}
            <header className="space-y-6">
              <div className="flex flex-wrap items-center gap-4 mb-2 border-b border-[#bdcaba]/30 pb-4">
                <span className="inline-flex items-center gap-1.5 text-[#16a34a] text-xs font-medium uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
                  {totalSeats > 0 ? `${totalSeats} Seats Available` : 'Seats Available'}
                </span>
                <span className="w-px h-4 bg-[#bdcaba]/50"></span>
                {centre.women_safe_verified && (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[#565e74] text-xs font-medium uppercase tracking-widest">
                      Women-safe
                    </span>
                    <span className="w-px h-4 bg-[#bdcaba]/50"></span>
                  </>
                )}
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest ${todayOpen ? 'text-[#565e74]' : 'text-rose-600'}`}>
                  {todayOpen ? 'Open Now' : 'Closed Now'}
                </span>
              </div>

              <h1 className="font-['Lexend',sans-serif] text-4xl md:text-5xl font-extrabold text-[#191c1e] uppercase tracking-tight">
                {centre.name}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-[#565e74] text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#191c1e] text-base">★</span>
                  <span className="font-semibold text-[#191c1e]">{centre.rating.toFixed(1)}</span>
                  <a href="#reviews" className="hover:text-[#191c1e] transition-colors cursor-pointer border-b border-[#bdcaba]">({centre.reviews_count} review{centre.reviews_count !== 1 ? 's' : ''})</a>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">📍</span>
                  <span>{fullAddress}</span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-6">
                {centre.phone && (
                  <a href={`tel:${centre.phone}`} className="flex items-center gap-2 px-5 py-2.5 border border-[#bdcaba] hover:border-[#191c1e] transition-colors text-[#191c1e] text-xs font-medium rounded uppercase tracking-wider">
                    <span>📞</span> Call
                  </a>
                )}
                {social.whatsapp && (
                  <a href={social.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 border border-[#bdcaba] hover:border-[#191c1e] transition-colors text-[#191c1e] text-xs font-medium rounded uppercase tracking-wider">
                    <span>💬</span> WhatsApp
                  </a>
                )}
                {centre.website && (
                  <a href={centre.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 border border-[#bdcaba] hover:border-[#191c1e] transition-colors text-[#191c1e] text-xs font-medium rounded uppercase tracking-wider">
                    <span>🌐</span> Website
                  </a>
                )}
                <div className="flex-grow"></div>
                {isPublic && viewer && <SaveButton centreId={centre.id} initialSaved={saved} />}
                <ShareButton title={centre.name} url={pageUrl} />
              </div>
            </header>

            {/* About Section */}
            <section className="pt-12 border-t border-[#bdcaba]/30" id="about">
              <h2 className="font-['Lexend',sans-serif] text-2xl font-bold mb-6 text-[#191c1e] uppercase tracking-wide">About this space</h2>
              <div className="text-base text-[#565e74] leading-loose space-y-6 max-w-3xl">
                {centre.description ? (
                  <p className="whitespace-pre-line">{centre.description}</p>
                ) : (
                  <p>Welcome to {centre.name}. Designed for serious aspirants and professionals, offering pristine study environments equipped with ergonomic seating, silent zones, and high-speed connectivity.</p>
                )}
              </div>
            </section>

            {/* Select Space Type Grid */}
            <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="spaces">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">Select Space Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {centre.resources.map((res, idx) => {
                  const pricing = (res.pricing ?? {}) as Record<string, number>;
                  const startPrice = pricing.month || pricing.hour || pricing.day || pricing.week || pricing.quarter;

                  return (
                    <div key={res.id} className="border border-[#e0e3e5] rounded-lg bg-white overflow-hidden flex flex-col hover:border-[#16a34a] transition-all">
                      <div className="p-5 flex flex-col flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-extrabold text-[#16a34a] uppercase tracking-wider block">Space {idx + 1}</span>
                            <h3 className="font-['Lexend',sans-serif] font-bold text-[#191c1e] text-lg">{res.label || `Study Space ${idx + 1}`}</h3>
                          </div>
                          <span className="text-xs font-bold bg-[#16a34a]/10 text-[#16a34a] px-2.5 py-1 rounded-full">
                            {res.unit_count ?? 10} Seats
                          </span>
                        </div>

                        <p className="text-xs text-[#565e74] capitalize">Type: {res.resource_type.replace('_', ' ')} {res.tier ? `(${res.tier})` : ''}</p>

                        <div className="mt-auto pt-4 border-t border-[#e0e3e5] flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-[#565e74] uppercase block">Starting from</span>
                            <span className="font-bold text-[#191c1e] text-base">{startPrice ? `₹${startPrice}` : '—'}</span>
                          </div>
                          <Link href={`/centres/${centre.slug}/book`} className="text-xs font-bold text-[#16a34a] hover:underline uppercase tracking-wider">
                            View Plans →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Highlights & Facilities */}
            <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="facilities">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">Highlights & Facilities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 border border-[#e0e3e5] bg-white rounded-lg overflow-hidden">
                {centre.amenities.map((a) => (
                  <div key={a.slug} className="flex items-center gap-3 p-4 border-b border-r border-[#e0e3e5] text-xs font-semibold text-[#191c1e]">
                    <span className="text-base text-[#16a34a]">{a.icon ?? '✓'}</span>
                    <span>{a.label}</span>
                  </div>
                ))}
                {(!centre.amenities || centre.amenities.length === 0) && (
                  <span className="text-xs text-[#8e99a8] italic p-4 col-span-3">No amenities listed yet.</span>
                )}
              </div>
            </section>

            {/* Choose Your Plan Section */}
            <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="pricing">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">Pricing Rates</h2>
              <PricingSyncProvider pricing={centre.resources[0] ? ((centre.resources[0].pricing ?? {}) as Record<string, number>) : null}>
                <PricingTabs
                  slug={centre.slug}
                  resource={{ id: centre.resources[0]!.id, label: centre.resources[0]!.label, tier: centre.resources[0]!.tier, pricing: (centre.resources[0]!.pricing ?? {}) as Record<string, number> }}
                />
              </PricingSyncProvider>
            </section>

            {/* Photo Gallery */}
            {centre.gallery.length > 0 && (
              <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="gallery">
                <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">Photo Gallery</h2>
                <GalleryLightbox
                  images={centre.gallery.map((img) => ({ id: img.id, url: galleryUrl(img.storage_path), alt: img.alt ?? `${centre.name} photo` }))}
                  previewCount={6}
                />
              </section>
            )}

            {/* Location & Contact */}
            <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="contact">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">Location & Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-[#565e74] uppercase tracking-wider block mb-1">Address</span>
                    <p className="text-[#191c1e] font-semibold">{fullAddress || 'Location details available on request.'}</p>
                  </div>
                  {centre.phone && (
                    <div>
                      <span className="font-bold text-[#565e74] uppercase tracking-wider block mb-1">Phone</span>
                      <a href={`tel:${centre.phone}`} className="text-[#16a34a] font-bold hover:underline">{centre.phone}</a>
                    </div>
                  )}
                  {centre.business_email && (
                    <div>
                      <span className="font-bold text-[#565e74] uppercase tracking-wider block mb-1">Email</span>
                      <a href={`mailto:${centre.business_email}`} className="text-[#16a34a] font-bold hover:underline">{centre.business_email}</a>
                    </div>
                  )}
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#e0e3e5]">
                  <h3 className="font-['Lexend',sans-serif] text-xs font-bold text-[#191c1e] uppercase tracking-wide mb-3">Send Enquiry</h3>
                  {isPublic && <EnquiryForm centreId={centre.id} />}
                </div>
              </div>
            </section>

            {/* Reviews */}
            <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="reviews">
              <div className="flex justify-between items-center border-b border-[#e0e3e5] pb-4">
                <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">
                  ★ {centre.rating.toFixed(1)} · {reviews.length} Reviews
                </h2>
              </div>
              {isPublic && viewer && viewer.id !== centre.owner_id && (
                <ReviewForm centreId={centre.id} />
              )}
              <div className="space-y-4">
                {reviews.map((rv) => (
                  <div key={rv.id} className="p-4 rounded-xl border border-[#e0e3e5] bg-[#f8faf8] text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#191c1e]">{rv.author?.full_name ?? 'Student'}</span>
                      <span className="text-amber-500 font-bold">★ {rv.rating}/5</span>
                    </div>
                    {rv.body && <p className="text-[#565e74]">{rv.body}</p>}
                  </div>
                ))}
                {reviews.length === 0 && (
                  <span className="text-xs text-[#8e99a8] italic">No reviews yet for this study room.</span>
                )}
              </div>
            </section>
          </div>

          {/* Right Column Sticky Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <BookingSidebar
                slug={centre.slug}
                isPublic={isPublic}
                pricing={centre.resources[0] ? ((centre.resources[0].pricing ?? {}) as Record<string, number>) : null}
                seatsFree={centre.occupancy?.seatsFree ?? null}
                phone={centre.phone}
                whatsapp={social.whatsapp || null}
                studentsCount={studentsCount}
              />

              <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3" id="hours-heading">
                <h3 className="font-['Lexend',sans-serif] text-xs font-bold text-[#191c1e] uppercase tracking-wider border-b border-[#f2f4f6] pb-2">
                  Operating Hours
                </h3>
                {schedule ? (
                  <OpeningHoursCard todayOpen={todayOpen} todayText={todayText} days={schedule} nowLabel={nowLabel} />
                ) : (
                  <span className="text-xs text-[#8e99a8] italic">Hours schedule not listed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
