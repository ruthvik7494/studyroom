'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleBooking } from '../actions';
import type { Period } from '../pricing';

/** Splits an ISO timestamp into its IST date ("2026-08-03") and time ("09:00") parts. */
function toISTParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return { date: ist.toISOString().slice(0, 10), time: ist.toISOString().slice(11, 16) };
}
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const todayISO = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);

export function RescheduleButton({
  bookingId, slug, period, currentStartsAt, groupId,
}: {
  bookingId: string; slug: string; period: Period; currentStartsAt: string;
  /** If this hour is part of a multi-hour group, pass the group id so the
   * redirect after rescheduling goes back to the group view (showing every
   * hour) instead of collapsing to just this one rescheduled hour. */
  groupId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = toISTParts(currentStartsAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isHourly = period === 'hour';

  const run = () => {
    setError(null);
    startTransition(async () => {
      // Day+ periods only ever ask for a date — keep the booking's existing
      // hour-of-day unchanged, since there's no time-of-day concept to pick.
      const effectiveTime = isHourly ? time : initial.time;
      const startsAt = new Date(`${date}T${effectiveTime}:00+05:30`).toISOString();
      const res = await rescheduleBooking({ bookingId, startsAt });
      if (!res.ok) { setError(res.error.message); return; }
      // rescheduleBooking creates a brand-new booking row and cancels the
      // old one — staying on this page's current URL would keep showing the
      // now-cancelled old booking. Navigate to wherever the new booking now
      // lives: the group view (same group id, unchanged) if this hour was
      // part of one, otherwise the new booking's own confirmation page.
      const target = groupId ? `?id=${groupId}&group=1` : `?id=${res.data.id}`;
      router.push(`/centres/${slug}/book/confirmed${target}`);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-secondary">
        Re-schedule
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
      {isHourly && (
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
      )}
      <button type="button" onClick={run} disabled={pending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? 'Saving…' : 'Confirm'}
      </button>
      <button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
        Cancel
      </button>
      {error && <span className="w-full text-xs text-destructive">{error}</span>}
    </div>
  );
}
