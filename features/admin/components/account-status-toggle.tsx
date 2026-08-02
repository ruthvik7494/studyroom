'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAccountStatus } from '../actions';

export function AccountStatusToggle({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSuspended = status === 'suspended';

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await setAccountStatus({ userId, status: isSuspended ? 'active' : 'suspended' });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${isSuspended ? 'border-primary/30 text-primary hover:bg-primary/5' : 'border-destructive/30 text-destructive hover:bg-destructive/5'}`}
      >
        {pending ? 'Saving…' : isSuspended ? 'Reactivate' : 'Suspend'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
