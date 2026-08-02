'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewRefund, completeRefund } from '../actions';

export function RefundActions({ refundId, status }: { refundId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const res = await reviewRefund({ refundId, approve: true });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };
  const reject = () => {
    setError(null);
    startTransition(async () => {
      const res = await reviewRefund({ refundId, approve: false, note: note || undefined });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };
  const markCompleted = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeRefund({ refundId });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {!showReject ? (
          <div className="flex gap-2">
            <button type="button" onClick={approve} disabled={pending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
              Approve
            </button>
            <button type="button" onClick={() => setShowReject(true)} disabled={pending} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
              Reject
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" className="h-8 w-48 rounded-md border border-input bg-background px-2 text-xs" />
            <div className="flex gap-2">
              <button type="button" onClick={reject} disabled={pending} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-60">
                Confirm reject
              </button>
              <button type="button" onClick={() => setShowReject(false)} disabled={pending} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
                Cancel
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex flex-col items-end gap-1">
        <button type="button" onClick={markCompleted} disabled={pending} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? 'Saving…' : 'Mark as refunded'}
        </button>
        <p className="text-[11px] text-muted-foreground">Process the refund in Razorpay first, then mark it here.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return null;
}
