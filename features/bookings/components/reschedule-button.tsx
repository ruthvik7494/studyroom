'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleBooking } from '../actions';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const todayISO = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);

export function RescheduleButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const startsAt = new Date(`${date}T${time}:00+05:30`).toISOString();
      const res = await rescheduleBooking({ bookingId, startsAt });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
      setOpen(false);
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
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
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
