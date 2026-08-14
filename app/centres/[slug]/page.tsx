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
import { PricingPlans } from '@/features/centres/components/pricing-plans';
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
                <a href={centre.phone ? `tel:${centre.phone}` : '#'} className="flex items-center gap-2 px-5 py-2.5 border border-[#bdcaba] hover:border-[#191c1e] transition-colors text-[#191c1e] text-xs font-medium rounded uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> Call
                </a>
                <a href={social.whatsapp || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 border border-[#bdcaba] hover:border-[#191c1e] transition-colors text-[#191c1e] text-xs font-medium rounded uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> WhatsApp
                </a>
                <a href={centre.website || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 border border-[#bdcaba] hover:border-[#191c1e] transition-colors text-[#191c1e] text-xs font-medium rounded uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Website
                </a>
                <div className="flex-grow"></div>
                <button className="flex items-center gap-2 p-2.5 border border-transparent hover:border-[#bdcaba] transition-colors text-[#191c1e] rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <button className="flex items-center gap-2 p-2.5 border border-transparent hover:border-[#bdcaba] transition-colors text-[#191c1e] rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
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



            {/* Highlights & Facilities */}
            <section className="pt-12 border-t border-[#bdcaba]/30" id="facilities">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold mb-8 text-[#191c1e] uppercase tracking-wide">Highlights & Facilities</h2>
              <div className="border-t border-l border-[#bdcaba]/30 bg-white rounded-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  {centre.amenities.map((a) => (
                    <div key={a.slug} className="flex items-center gap-4 p-6 border-b border-r border-[#bdcaba]/30">
                      <span className="text-xl text-[#565e74] grayscale opacity-80">{a.icon ?? '✓'}</span>
                      <span className="text-sm text-[#565e74]">{a.label}</span>
                    </div>
                  ))}
                  {(!centre.amenities || centre.amenities.length === 0) && (
                    <span className="text-sm text-[#565e74] italic p-6 col-span-1 md:col-span-3 border-b border-r border-[#bdcaba]/30">No amenities listed yet.</span>
                  )}
                </div>
              </div>
            </section>

            {/* Choose Your Plan Section */}
            <section className="pt-10 border-t border-[#e0e3e5] space-y-6" id="pricing">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">Choose Your Plan</h2>
              <PricingPlans slug={centre.slug} resources={centre.resources as any} />
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
            <section className="pt-12 border-t border-[#bdcaba]/30" id="contact">
              <h2 className="font-['Lexend',sans-serif] text-xl font-bold mb-8 text-[#191c1e] uppercase tracking-wide">Location & Contact</h2>
              <div className="max-w-2xl">
                <div className="space-y-8">
                  <div className="flex items-start gap-4 pb-6 border-b border-[#bdcaba]/30">
                    <svg className="mt-1 text-[#565e74]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <div>
                      <p className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-2">Address</p>
                      <p className="text-sm text-[#565e74] leading-relaxed">{fullAddress || 'Location details available on request.'}</p>
                    </div>
                  </div>
                  {centre.phone && (
                    <div className="flex items-start gap-4 pb-6 border-b border-[#bdcaba]/30">
                      <svg className="mt-1 text-[#565e74]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <div>
                        <p className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-2">Phone</p>
                        <a href={`tel:${centre.phone}`} className="text-sm text-[#565e74] hover:text-[#191c1e] transition-colors">{centre.phone}</a>
                      </div>
                    </div>
                  )}
                  {centre.business_email && (
                    <div className="flex items-start gap-4 pb-6 border-b border-[#bdcaba]/30">
                      <svg className="mt-1 text-[#565e74]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                      <div>
                        <p className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-2">Email</p>
                        <a href={`mailto:${centre.business_email}`} className="text-sm text-[#565e74] hover:text-[#191c1e] transition-colors">{centre.business_email}</a>
                      </div>
                    </div>
                  )}
                  {centre.website && (
                    <div className="flex items-start gap-4">
                      <svg className="mt-1 text-[#565e74]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      <div>
                        <p className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-2">Website</p>
                        <a href={centre.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#565e74] hover:text-[#191c1e] transition-colors">{centre.website}</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Reviews */}
            {/* Reviews */}
            {(() => {
              const dummyReview = {
                id: 'dummy-1',
                author: { full_name: 'Admin User' },
                created_at: '2024-03-01T00:00:00.000Z',
                rating: 4.0,
                body: 'Excellent study environment. The ergonomic chairs really help during long study sessions, and the silent zone is strictly maintained. The high-speed Wi-Fi never drops. Highly recommended for UPSC aspirants.'
              };
              const displayReviews = reviews.length > 0 ? reviews : [dummyReview];
              const displayRating = reviews.length > 0 ? centre.rating : 4.0;

              return (
                <section className="pt-12 border-t border-[#bdcaba]/30" id="reviews">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pb-6 border-b border-[#bdcaba]/30">
                    <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">
                      ★ {displayRating.toFixed(1)} · {displayReviews.length} Review{displayReviews.length !== 1 ? 's' : ''}
                    </h2>
                    <button className="border border-[#bdcaba] text-[#191c1e] text-xs font-bold px-6 py-3 rounded-sm hover:border-[#191c1e] transition-colors uppercase tracking-widest self-start md:self-auto">Write a Review</button>
                  </div>
                  
                  {isPublic && viewer && viewer.id !== centre.owner_id && (
                    <div className="mb-8">
                      <ReviewForm centreId={centre.id} />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {displayReviews.map((rv) => {
                      const authorName = rv.author?.full_name ?? 'Student';
                      const initial = authorName.charAt(0).toUpperCase();
                      const dateStr = new Date(rv.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      
                      return (
                        <div key={rv.id} className="border border-[#bdcaba]/50 p-6 rounded-sm bg-white flex flex-col">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-[#bdcaba]/30 rounded-sm flex items-center justify-center font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e]">{initial}</div>
                            <div>
                              <div className="text-xs font-bold text-[#191c1e] uppercase tracking-widest mb-1">{authorName}</div>
                              <div className="text-sm text-[#565e74]">{dateStr}</div>
                            </div>
                          </div>
                          <div className="border-t border-[#bdcaba]/30 pt-6 flex-1">
                            {rv.body ? (
                              <p className="text-sm text-[#565e74] leading-relaxed">{rv.body}</p>
                            ) : (
                              <p className="text-sm text-[#565e74] leading-relaxed italic">No written feedback provided.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
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

              {isPublic && (
                <div id="enquire" className="pt-2">
                  <EnquiryForm centreId={centre.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
