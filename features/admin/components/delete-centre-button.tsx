'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { adminDeleteCentre } from '../actions';

/**
 * "Delete" is a soft-delete: sets status to 'archived' (the existing lifecycle
 * state), which removes the listing from the public site while keeping its
 * bookings/payment history intact — not a real SQL DELETE.
 */
export function DeleteCentreButton({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await adminDeleteCentre({ centreId });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Remove this listing?</span>
        <Button size="sm" variant="destructive" disabled={pending} onClick={run}>
          {pending ? 'Removing…' : 'Confirm'}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
      Delete
    </Button>
  );
}
