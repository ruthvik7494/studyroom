'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelBooking } from '../actions';

export function CancelBookingButton({ bookingIds, slug }: { bookingIds: string[]; slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      for (const id of bookingIds) {
        const res = await cancelBooking({ bookingId: id });
        if (!res.ok) { setError(res.error.message); return; }
      }
      router.push(`/centres/${slug}`);
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Cancel this booking?</span>
        <button type="button" onClick={run} disabled={pending} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-60">
          {pending ? 'Cancelling…' : 'Yes, cancel'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
          Never mind
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-full border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5"
    >
      Cancel Request
    </button>
  );
}
