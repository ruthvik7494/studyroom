'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAccountStatus } from '../actions';

/**
 * Reactivating a deleted account just sets account_status back to 'active'
 * — the same admin_set_account_status() RPC already used for suspend/
 * unsuspend (0043_account_status.sql) accepts 'active' as a target
 * regardless of the current status, so no new backend call was needed.
 * Their name still reads "Deleted User" (scrubbed on approval) until they
 * update it themselves from My Profile — this only restores login access.
 */
export function AccountStatusToggle({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingReactivateDeleted, setConfirmingReactivateDeleted] = useState(false);

  const setStatus = (next: 'active' | 'suspended') => {
    setError(null);
    startTransition(async () => {
      const res = await setAccountStatus({ userId, status: next });
      if (!res.ok) { setError(res.error.message); return; }
      setConfirmingReactivateDeleted(false);
      router.refresh();
    });
  };

  if (status === 'deleted') {
    if (confirmingReactivateDeleted) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Restore login access?</span>
          <button
            type="button"
            onClick={() => setStatus('active')}
            disabled={pending}
            className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {pending ? 'Reactivating…' : 'Yes, reactivate'}
          </button>
          <button type="button" onClick={() => setConfirmingReactivateDeleted(false)} className="text-xs text-muted-foreground hover:underline">
            Cancel
          </button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setConfirmingReactivateDeleted(true)}
          title="Restores login access only — their name still reads 'Deleted User' until they update it themselves from My Profile."
          className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
        >
          Reactivate
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    );
  }

  const isSuspended = status === 'suspended';
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setStatus(isSuspended ? 'active' : 'suspended')}
        disabled={pending}
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${isSuspended ? 'border-primary/30 text-primary hover:bg-primary/5' : 'border-destructive/30 text-destructive hover:bg-destructive/5'}`}
      >
        {pending ? 'Saving…' : isSuspended ? 'Reactivate' : 'Suspend'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
