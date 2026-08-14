import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { StudentBookingCalendar } from '@/features/bookings/components/student-booking-calendar';

export const metadata: Metadata = { title: 'My Calendar', ...noindex };
export const dynamic = 'force-dynamic';

export default async function StudentCalendarPage() {
  const user = await requireUser();
  const db = await createClient();

  const { data: bookings } = await db
    .from('bookings')
    .select('id, period, amount, status, payment, starts_at, ends_at, centres(name)')
    .eq('user_id', user.id)
    .order('starts_at', { ascending: false });

  const calendarItems = (bookings ?? []).map((b) => {
    const c = b.centres as unknown as { name: string } | null;
    return {
      id: b.id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      period: b.period,
      status: b.status,
      payment: b.payment,
      centreName: c?.name ?? 'Centre',
    };
  });

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-['Lexend',sans-serif] text-2xl font-bold text-[#191c1e]">
          My Booking Calendar 📅
        </h1>
        <p className="mt-1 text-sm text-[#565e74]">
          View your booked dates, start/end times, and reservation details in one place.
        </p>
      </div>

      <div className="w-full">
        <StudentBookingCalendar bookings={calendarItems} />
      </div>
    </div>
  );
}
