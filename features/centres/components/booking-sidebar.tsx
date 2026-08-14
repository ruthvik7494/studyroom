import Link from 'next/link';
import { SidebarPrice } from './sidebar-price';

export function BookingSidebar({
  slug,
  isPublic,
  pricing,
  seatsFree,
  totalSeats,
  phone,
  whatsapp,
  studentsCount,
}: {
  slug: string;
  isPublic: boolean;
  pricing: Record<string, number> | null;
  seatsFree: number | null;
  totalSeats?: number | null;
  phone: string | null;
  whatsapp: string | null;
  studentsCount: number;
}) {
  const actualPrice = pricing?.month || pricing?.week || pricing?.day || (pricing && Object.values(pricing).find(v => !!v));
  const startPrice = actualPrice || '2,500';
  const periodLabel = actualPrice 
    ? (pricing?.month ? '/month' : pricing?.week ? '/week' : pricing?.day ? '/day' : '') 
    : '/month';

  return (
    <div className="bg-white border border-[#bdcaba]/50 p-8 rounded-sm">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="text-[#565e74] text-xs font-bold uppercase tracking-widest mb-1.5">Starting price</div>
          <div className="font-['Lexend',sans-serif] text-3xl sm:text-4xl text-[#191c1e] font-bold flex items-baseline gap-1.5">
            ₹{startPrice}
            <span className="text-xs text-[#565e74] font-normal">{periodLabel}</span>
          </div>
        </div>

        {/* Seat Availability Badge on Right Side */}
        <div className="bg-[#16a34a]/10 border border-[#16a34a]/25 px-3 py-2 rounded-lg flex items-center gap-2 text-right shrink-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${seatsFree !== 0 ? 'bg-[#16a34a] animate-pulse' : 'bg-rose-500'}`} />
          <div className="text-[11px] font-bold text-[#15803d]">
            {seatsFree !== null ? (
              totalSeats ? `${seatsFree} / ${totalSeats} Available` : `${seatsFree} Available`
            ) : (
              'Limited'
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3 mb-8">
        {isPublic && (
          <Link href={`/centres/${slug}/book`} className="block w-full text-center bg-[#16a34a] text-white hover:text-white text-xs font-bold py-4 rounded-sm hover:bg-[#15803d] transition-colors uppercase tracking-widest shadow-sm">
            Book Now
          </Link>
        )}

        {/* WhatsApp & Call Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {(() => {
            const waNum = (whatsapp || phone || '9876543210').replace(/\D/g, '');
            const waUrl = `https://wa.me/91${waNum}`;
            const callNum = (phone || '9876543210').replace(/\D/g, '');
            const callUrl = `tel:${callNum}`;
            return (
              <>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/30 py-2.5 px-2 rounded-sm text-xs font-bold transition-colors tracking-wider"
                  title={`WhatsApp: ${waUrl}`}
                >
                  WhatsApp
                </a>
                <a
                  href={callUrl}
                  className="flex items-center justify-center bg-[#0b192c]/5 text-[#0b192c] hover:bg-[#0b192c]/10 border border-[#0b192c]/20 py-2.5 px-2 rounded-sm text-xs font-bold transition-colors tracking-wider"
                  title={`Call: ${callNum}`}
                >
                  Call
                </a>
              </>
            );
          })()}
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
