'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

export interface BookingCalendarItem {
  id: string;
  starts_at: string;
  ends_at: string;
  period: string;
  status: string;
  payment: string;
  centreName: string;
}

export function StudentBookingCalendar({ bookings }: { bookings: BookingCalendarItem[] }) {
  const today = new Date();

  // Helper to format local Date into YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(today);

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map bookings by date string YYYY-MM-DD
  const bookingMap = new Map<string, BookingCalendarItem[]>();

  bookings.forEach((b) => {
    const startDate = new Date(b.starts_at);
    const endDate = new Date(b.ends_at);

    // If starts_at and ends_at span across multiple days (e.g. day, week, month passes),
    // add booking to all covered dates in the range.
    const curr = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Loop through date range (inclusive of start date)
    while (curr <= last) {
      const dateKey = formatLocalDate(curr);
      const list = bookingMap.get(dateKey) ?? [];
      // avoid duplicates for exact same booking ID on same day
      if (!list.some((item) => item.id === b.id)) {
        list.push(b);
        bookingMap.set(dateKey, list);
      }
      curr.setDate(curr.getDate() + 1);
    }
  });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const selectedBookings = bookingMap.get(selectedDateStr) ?? [];

  return (
    <Card className="p-6 bg-white shadow-sm border border-[#e0e3e5] rounded-2xl">
      <div className="grid md:grid-cols-[340px_1fr] gap-8 items-start">
        {/* Left Side: Calendar Month View */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Lexend',sans-serif] text-base font-bold text-[#191c1e] flex items-center gap-2">
              <span>📅</span> Booking Calendar
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="h-8 w-8 flex items-center justify-center rounded-lg border text-xs hover:bg-[#f2f4f6] text-[#565e74]"
              >
                ←
              </button>
              <span className="text-xs font-semibold px-2 text-[#191c1e] min-w-[100px] text-center">
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                className="h-8 w-8 flex items-center justify-center rounded-lg border text-xs hover:bg-[#f2f4f6] text-[#565e74]"
              >
                →
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase text-[#565e74] mb-2">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hasBooking = bookingMap.has(dateKey);
              const isSelected = selectedDateStr === dateKey;
              const isToday = todayStr === dateKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDateStr(dateKey)}
                  className={`h-9 w-full rounded-xl flex flex-col items-center justify-center relative transition-colors ${
                    isSelected
                      ? 'bg-[#006b2c] text-white font-bold shadow-sm'
                      : isToday
                      ? 'bg-[#006b2c]/10 text-[#006b2c] font-bold'
                      : 'hover:bg-[#f2f4f6] text-[#191c1e]'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasBooking && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full absolute bottom-1 ${
                        isSelected ? 'bg-white' : 'bg-[#16a34a]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Event Details for Selected Day */}
        <div className="md:border-l md:border-[#e0e3e5] md:pl-8">
          <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e5] mb-4">
            <p className="text-sm font-bold text-[#191c1e] uppercase tracking-wide">
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <span className="text-xs font-semibold text-[#565e74] bg-[#f2f4f6] px-2.5 py-1 rounded-full">
              {selectedBookings.length} {selectedBookings.length === 1 ? 'Booking' : 'Bookings'}
            </span>
          </div>

          {selectedBookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#565e74] italic">
              No bookings scheduled for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedBookings.map((b) => {
                const start = new Date(b.starts_at);
                const end = new Date(b.ends_at);
                const isHourly = b.period === 'hour';
                const timeStr = isHourly
                  ? `${start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                  : `${b.period.toUpperCase()} PASS`;

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-[#f8faf8] border border-[#16a34a]/30 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-[#191c1e] text-base">{b.centreName}</p>
                      <p className="text-xs font-semibold text-[#006b2c] mt-1 flex items-center gap-1">
                        <span>⏱</span> {timeStr}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize text-[#565e74] bg-white border px-2.5 py-1 rounded-md">
                        {b.period}
                      </span>
                      <span
                        className={`text-xs font-bold capitalize px-3 py-1 rounded-full ${
                          b.status === 'confirmed'
                            ? 'bg-[#16a34a]/10 text-[#16a34a]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
