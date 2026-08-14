'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelBooking } from '../actions';

export function RemoveBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm('Are you sure you want to remove this booking?')) return;
          startTransition(async () => {
            setError(null);
            const res = await cancelBooking({ bookingId, reason: 'Cancelled by user' });
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            router.refresh();
          });
        }}
        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
