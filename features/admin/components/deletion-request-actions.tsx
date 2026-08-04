'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { approveAccountDeletion, rejectAccountDeletion } from '../actions';

/**
 * Approving is irreversible: permanently disables the login and scrubs
 * personal info (see admin_approve_account_deletion in
 * 0049_account_deletion_requests.sql). Booking/payment/review records are
 * NOT deleted — kept for the retention period per the Privacy Policy.
 */
export function DeletionRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveAccountDeletion({ requestId });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };

  const reject = () => {
    setError(null);
    startTransition(async () => {
      const res = await rejectAccountDeletion({ requestId, notes });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };

  if (confirmingApprove) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-xs font-semibold text-destructive">Permanently delete this account?</span>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={pending} onClick={approve}>
            {pending ? 'Deleting…' : 'Yes, delete'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingApprove(false)}>Cancel</Button>
        </div>
        {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (optional)"
          className="h-9 w-56"
          aria-label="Rejection note"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={reject}>
            {pending ? 'Declining…' : 'Confirm decline'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
        </div>
        {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="destructive" onClick={() => setConfirmingApprove(true)}>Approve &amp; Delete</Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>Decline</Button>
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
