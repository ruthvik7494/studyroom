import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCentreBySlug, getCentreReviews } from '@/features/centres/services/centres.service';
import { getSessionUser } from '@/lib/auth/rbac';
import { ShareButton } from '@/features/centres/components/share-button';
import { SaveButton } from '@/features/saved/components/save-button';
import { EnquiryForm } from '@/features/enquiries/components/enquiry-form';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { GalleryLightbox } from '@/features/centres/components/gallery-lightbox';
import { isSaved } from '@/features/saved/services/saved.service';
import { formatINR } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await createClient();
  const centre = await getCentreBySlug(db, slug);
  if (!centre) return { title: 'Not found' };

  return {
    title: `${centre.name} (V2 Preview)`,
    description: `Modern V2 detail template for ${centre.name}.`,
  };
}

export default async function CentreDetailV2Page({ params }: PageProps) {
  const { slug } = await params;
  const db = await createClient();
  const centre = await getCentreBySlug(db, slug);
  if (!centre) notFound();

  const [reviews, viewer] = await Promise.all([
    getCentreReviews(db, centre.id),
    getSessionUser(),
  ]);

  const saved = viewer ? await isSaved(db, viewer.id, centre.id) : false;
  const totalSeats = centre.resources.reduce((sum, r) => sum + (r.unit_count ?? 0), 0);
  const minPrice = centre.fromMonthly ?? 1400;
  const fullAddress = [centre.address, centre.city, centre.state, centre.postcode].filter(Boolean).join(', ');

  const galleryImages = (centre.gallery || [])
    .map((item) => {
      const url = typeof item === 'string' ? item : (item as { url?: string })?.url || '';
      if (!url) return '';
      return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${url}`;
    })
    .filter(Boolean);

  if (centre.cover_url && !galleryImages.includes(centre.cover_url)) {
    galleryImages.unshift(centre.cover_url);
  }

  return (
    <div className="bg-[#f8fafc] text-slate-900 min-h-screen pb-24 font-['Inter',sans-serif]">
      {/* Top Banner / Navigation Switcher Bar */}
      <div className="bg-emerald-950 text-white py-2.5 px-6 border-b border-emerald-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded text-[10px] uppercase">Template V2</span>
          <span className="font-medium text-emerald-200">Modern Hero &amp; Sticky Booking Bar Layout</span>
        </div>
        <Link href={`/centres/${centre.slug}`} className="text-emerald-400 hover:underline font-semibold flex items-center gap-1">
          Switch to V1 Original Template →
        </Link>
      </div>

      {/* Modern V2 Hero Header & Quick Specs */}
      <div className="relative bg-slate-900 text-white py-12 md:py-16 px-6 md:px-16 overflow-hidden">
        {centre.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={centre.cover_url} alt={centre.name} className="absolute inset-0 w-full h-full object-cover opacity-25 scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

        <div className="relative z-10 max-w-[1280px] mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Verified Study Hall
              </span>
              {centre.women_safe_verified && (
                <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                  Women-Only Safe Zone
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <SaveButton centreId={centre.id} initialSaved={saved} />
              <ShareButton title={centre.name} text={`Check out ${centre.name} on StudyNook`} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold font-['Lexend',sans-serif] tracking-tight text-white leading-tight">
              {centre.name}
            </h1>
            <p className="text-sm md:text-base text-slate-300 flex items-center gap-1.5">
              <span>📍</span> {fullAddress || centre.area || 'Hanamkonda'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs md:text-sm font-semibold">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15">
              <span className="text-amber-400 font-bold">★</span>
              <span className="font-extrabold text-white">{centre.rating.toFixed(1)}</span>
              <span className="text-slate-400">({centre.reviews_count} reviews)</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15">
              <span>⚡</span>
              <span className="text-emerald-400 font-bold">45 / {totalSeats || 60} Seats Free</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15">
              <span>💰</span>
              <span className="text-white font-bold">{formatINR(minPrice)} / month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Page Layout Grid */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Media Gallery, Amenities, Overview, Reviews */}
        <div className="lg:col-span-8 space-y-10">
          {/* Photo Gallery Grid */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xl font-bold font-['Lexend',sans-serif] text-slate-900">Centre Photos</h2>
            {galleryImages.length > 0 ? (
              <GalleryLightbox images={galleryImages} title={centre.name} />
            ) : (
              <div className="h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-medium">
                No photos uploaded yet
              </div>
            )}
          </div>

          {/* Key Amenities */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xl font-bold font-['Lexend',sans-serif] text-slate-900">Amenities &amp; Facilities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs md:text-sm">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <span>📶</span> High-speed Wi-Fi
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <span>❄️</span> AC Climate Control
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <span>⚡</span> 24/7 Power Backup
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <span>🔒</span> Personal Lockers
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <span>☕</span> Beverage &amp; Water Pantry
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2 font-semibold">
                <span>🧼</span> Hygienic Washrooms
              </div>
            </div>
          </div>

          {/* Overview & Rules */}
          {centre.description && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xl font-bold font-['Lexend',sans-serif] text-slate-900">About this Centre</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{centre.description}</p>
            </div>
          )}

          {/* Student Reviews */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-['Lexend',sans-serif] text-slate-900">
                Student Reviews ({reviews.length})
              </h2>
              <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                ★ {centre.rating.toFixed(1)} / 5.0
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{rev.userName || 'Anonymous Student'}</span>
                      <span className="text-amber-500 font-bold text-xs">★ {rev.rating}</span>
                    </div>
                    {rev.comment && <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No student reviews yet. Be the first to leave a review!</p>
            )}

            <ReviewForm centreId={centre.id} />
          </div>
        </div>

        {/* Right Column: Sticky Booking & Quick Enquiry Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-6 space-y-6">
            {/* Quick Price & Action Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg space-y-5">
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Monthly Membership</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-[#006b2c] font-['Lexend',sans-serif]">
                    {formatINR(minPrice)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                <span>Availability Status</span>
                <span className="font-bold text-emerald-700">45 Seats Open</span>
              </div>

              <Link
                href={`/book/${centre.id}`}
                className="w-full bg-[#006b2c] hover:bg-[#005221] text-white font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Reserve a Desk Now</span>
                <span>→</span>
              </Link>
            </div>

            {/* Quick Enquiry Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold font-['Lexend',sans-serif] text-slate-900">Have Questions?</h3>
              <EnquiryForm centreId={centre.id} centreName={centre.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
