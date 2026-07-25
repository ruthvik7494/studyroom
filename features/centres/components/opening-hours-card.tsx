'use client';
import { useState } from 'react';

export interface DaySchedule {
  label: string;
  isOpen: boolean;
  is24h: boolean;
  text: string; // formatted hours, or "Closed"
  isToday: boolean;
}

/**
 * Weekly Opening Hours card. Data (today's status, per-day text) is computed
 * server-side from the real centre_hours schedule the owner set while
 * creating/editing their listing — nothing here is hardcoded or guessed.
 */
export function OpeningHoursCard({
  todayOpen,
  todayText,
  days,
  nowLabel,
}: {
  todayOpen: boolean | null; // null = no schedule configured at all
  todayText: string;
  days: DaySchedule[];
  nowLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-lg">🕐</span>
          <span className={`font-bold ${todayOpen ? 'text-brand-green' : 'text-destructive'}`}>
            {todayOpen === null ? 'Hours' : todayOpen ? 'Open' : 'Closed'}
          </span>
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {todayOpen !== null && <span>Open hours today: {todayText}</span>}
          <span
            aria-hidden
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </span>
      </button>

      {expanded && (
        <div className="mt-3 divide-y border-t">
          {days.map((d) => (
            <div key={d.label} className={`flex items-center justify-between py-2.5 text-sm ${d.isToday ? 'font-semibold' : ''}`}>
              <span>{d.label}</span>
              <span className={!d.isOpen ? 'text-muted-foreground' : ''}>
                {d.is24h ? 'Open 24h' : d.text}
              </span>
            </div>
          ))}
          <p className="pt-3 text-right text-xs italic text-muted-foreground">{nowLabel} local time</p>
        </div>
      )}
    </div>
  );
}
