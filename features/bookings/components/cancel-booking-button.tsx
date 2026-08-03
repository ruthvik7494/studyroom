'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelBooking } from '../actions';

const REASONS = [
  'Change of plans',
  'Found a better option',
  'Booked by mistake',
  'Price too high',
  'Centre not as expected',
  'Other',
];

export function CancelBookingButton({ bookingIds, slug }: { bookingIds: string[]; slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    const finalReason = reason === 'Other' ? (otherReason.trim() || 'Other') : reason;
    startTransition(async () => {
      // Cancelling one hour of a group doesn't depend on any other hour in
      // it, so there's no reason to wait for each one before starting the
      // next — this was a real, measurable slowdown on longer bookings
      // (an 8-hour group meant 8 sequential round-trips). Running them in
      // parallel also means a single failing hour no longer silently leaves
      // the rest of the group un-cancelled, which the old stop-at-first-
      // error loop did.
      const results = await Promise.all(bookingIds.map((id) => cancelBooking({ bookingId: id, reason: finalReason })));
      const failed = results.find((res) => !res.ok);
      if (failed && !failed.ok) { setError(failed.error.message); return; }
      router.push(`/centres/${slug}`);
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="w-full max-w-sm space-y-2 rounded-lg border p-3">
        <label htmlFor="cancel-reason" className="block text-xs font-medium text-muted-foreground">Why are you cancelling?</label>
        <select id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {reason === 'Other' && (
          <input
            type="text"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            placeholder="Tell us more (optional)"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={run} disabled={pending} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-60">
            {pending ? 'Cancelling…' : 'Confirm cancellation'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
            Never mind
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
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
