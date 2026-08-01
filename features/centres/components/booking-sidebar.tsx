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
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <SidebarPrice pricing={pricing} />

        {seatsFree !== null && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />{seatsFree} Seats Available
          </p>
        )}

        <div className="mt-4 space-y-2">
          {isPublic && (
            <Link href={`/centres/${slug}/book`} className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Book Now
            </Link>
          )}
          <a href="#pricing-heading" className="block w-full rounded-lg border py-2.5 text-center text-sm font-bold hover:bg-secondary">
            Check Availability
          </a>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="block w-full rounded-lg border border-[#25D366]/40 bg-[#25D366]/5 py-2.5 text-center text-sm font-bold text-[#128C36] hover:bg-[#25D366]/10">
              💬 Chat on WhatsApp
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="block w-full rounded-lg border py-2.5 text-center text-sm font-bold hover:bg-secondary">
              📞 Call Owner
            </a>
          )}
        </div>

        <div className="mt-4 space-y-2 border-t pt-4 text-sm">
          <p className="flex items-center gap-2"><span className="text-primary" aria-hidden>✓</span>Instant confirmation — no waiting for approval</p>
          <p className="flex items-center gap-2"><span className="text-primary" aria-hidden>✓</span>Transparent pricing, no hidden charges</p>
          <p className="flex items-center gap-2"><span className="text-primary" aria-hidden>✓</span>Secure payments via Razorpay</p>
          {studentsCount > 0 && (
            <p className="flex items-center gap-2"><span className="text-primary" aria-hidden>✓</span>Trusted by {studentsCount}+ students on StudyNook</p>
          )}
        </div>
      </div>
  );
}
