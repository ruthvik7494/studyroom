import Link from 'next/link';
import { SidebarPrice } from './sidebar-price';

export function BookingSidebar({
  slug,
  isPublic,
  pricing,
  seatsFree,
  phone,
  whatsapp,
  studentsCount,
}: {
  slug: string;
  isPublic: boolean;
  pricing: Record<string, number> | null;
  seatsFree: number | null;
  phone: string | null;
  whatsapp: string | null;
  studentsCount: number;
}) {
  const actualPrice = pricing?.fortnight || pricing?.month || pricing?.week || (pricing && Object.values(pricing).find(v => !!v));
  const startPrice = actualPrice || '12,000';
  const periodLabel = actualPrice 
    ? (pricing?.fortnight ? '/2 weeks' : pricing?.month ? '/month' : pricing?.week ? '/week' : '') 
    : '/2 weeks';

  return (
    <div className="bg-white border border-[#bdcaba]/50 p-8 rounded-sm">
      <div className="mb-8 pb-8 border-b border-[#bdcaba]/30">
        <div className="text-[#565e74] text-xs font-bold uppercase tracking-widest mb-2">Starting price</div>
        <div className="font-['Lexend',sans-serif] text-4xl text-[#191c1e] font-bold flex items-baseline gap-2">
          ₹{startPrice}
          <span className="text-sm text-[#565e74] font-normal">{periodLabel}</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mb-8">
        {isPublic && (
          <Link href={`/centres/${slug}/book`} className="block w-full text-center bg-[#16a34a] text-white text-xs font-bold py-4 rounded-sm hover:bg-[#15803d] transition-colors uppercase tracking-widest shadow-sm">
            Book Now
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 p-4 border border-[#bdcaba]/30 rounded-sm mb-8">
        <div className={`w-2 h-2 rounded-full ${seatsFree !== 0 ? 'bg-[#16a34a] animate-pulse' : 'bg-rose-500'}`}></div>
        <div className="flex-1">
          <div className="text-sm font-bold text-[#191c1e]">
            {seatsFree !== null ? `${seatsFree} seats available` : 'Availability limited'}
          </div>
          <div className="text-xs text-[#565e74] mt-1">Today, book your spot</div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-[#bdcaba]/30">
        <div className="flex items-center gap-4 text-sm text-[#565e74]">
          <svg className="text-[#191c1e]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Instant confirmation
        </div>
        <div className="flex items-center gap-4 text-sm text-[#565e74]">
          <svg className="text-[#191c1e]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          Transparent pricing
        </div>
        {studentsCount > 0 && (
          <div className="flex items-center gap-4 text-sm text-[#565e74]">
            <svg className="text-[#191c1e]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Trusted by {studentsCount}+ students
          </div>
        )}
      </div>
    </div>
  );
}
