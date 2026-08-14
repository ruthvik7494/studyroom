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
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().slice(0, 10)
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map bookings by date string YYYY-MM-DD
  const bookingMap = new Map<string, BookingCalendarItem[]>();
  bookings.forEach((b) => {
    const dateKey = new Date(b.starts_at).toISOString().slice(0, 10);
    const list = bookingMap.get(dateKey) ?? [];
    list.push(b);
    bookingMap.set(dateKey, list);
  });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const selectedBookings = bookingMap.get(selectedDateStr) ?? [];

  return (
    <Card className="p-4 bg-white shadow-sm border border-[#e0e3e5] rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-['Lexend',sans-serif] text-sm font-bold text-[#191c1e]">
          📅 Booking Calendar
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="h-7 w-7 flex items-center justify-center rounded-lg border text-xs hover:bg-[#f2f4f6] text-[#565e74]"
          >
            ←
          </button>
          <span className="text-xs font-semibold px-2 text-[#191c1e] min-w-[90px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="h-7 w-7 flex items-center justify-center rounded-lg border text-xs hover:bg-[#f2f4f6] text-[#565e74]"
          >
            →
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-[#565e74] mb-1">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateObj = new Date(year, month, dayNum);
          // Format local date string YYYY-MM-DD
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const hasBooking = bookingMap.has(dateKey);
          const isSelected = selectedDateStr === dateKey;
          const isToday = today.toISOString().slice(0, 10) === dateKey;

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDateStr(dateKey)}
              className={`h-8 w-full rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                isSelected
                  ? 'bg-[#006b2c] text-white font-bold'
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

      {/* Selected Day Details */}
      <div className="mt-4 pt-3 border-t border-[#e0e3e5]">
        <p className="text-xs font-bold text-[#565e74] uppercase tracking-wider mb-2">
          {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </p>

        {selectedBookings.length === 0 ? (
          <p className="text-xs text-[#565e74] italic">No bookings for this date.</p>
        ) : (
          <div className="space-y-2">
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
                  className="p-2.5 rounded-xl bg-[#f8faf8] border border-[#16a34a]/20 text-xs"
                >
                  <p className="font-bold text-[#191c1e]">{b.centreName}</p>
                  <p className="text-[11px] font-semibold text-[#006b2c] mt-0.5">⏱ {timeStr}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="capitalize text-[#565e74]">{b.period}</span>
                    <span
                      className={`font-semibold capitalize ${
                        b.status === 'confirmed' ? 'text-[#16a34a]' : 'text-amber-700'
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
    </Card>
  );
}
