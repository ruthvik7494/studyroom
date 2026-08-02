'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleSaved } from '../actions';

export function RemoveSavedButton({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null);
          const res = await toggleSaved({ centreId, save: false });
          if (!res.ok) { setError(res.error.message); return; }
          router.refresh();
        })}
        className="rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary"
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
