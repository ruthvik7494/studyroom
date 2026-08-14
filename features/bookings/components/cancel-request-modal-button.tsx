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

export function CancelRequestModalButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [otherReason, setOtherReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCancel = () => {
    setError(null);
    const finalReason = reason === 'Other' ? (otherReason.trim() || 'Other') : reason;
    startTransition(async () => {
      const res = await cancelBooking({ bookingId, reason: finalReason });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
      >
        Cancel Request
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e0e3e5] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e5]">
              <h3 className="font-['Lexend',sans-serif] text-base font-bold text-[#191c1e]">
                Cancel Booking &amp; Request Refund
              </h3>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="text-muted-foreground hover:text-foreground text-sm font-bold h-6 w-6 rounded-full border flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#565e74]">
              Are you sure you want to cancel this booking? A refund request will be automatically sent to the study centre owner.
            </p>

            <div className="space-y-3">
              <div>
                <label htmlFor="modal-cancel-reason" className="block text-xs font-bold text-[#191c1e] mb-1">
                  Reason for Cancellation
                </label>
                <select
                  id="modal-cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#c4c6cf] bg-white px-3 text-xs font-medium text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c]"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {reason === 'Other' && (
                <div>
                  <label htmlFor="modal-other-reason" className="block text-xs font-bold text-[#191c1e] mb-1">
                    Details
                  </label>
                  <input
                    id="modal-other-reason"
                    type="text"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Tell us more (optional)"
                    className="h-10 w-full rounded-xl border border-[#c4c6cf] bg-white px-3 text-xs font-medium text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c]"
                  />
                </div>
              )}
            </div>

            {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e3e5]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={pending}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
              >
                {pending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
