'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveCentre, unarchiveCentre, setCentrePublished } from '../actions';

export function ArchiveButton({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await archiveCentre({ centreId });
      if (!res.ok) { setError(res.error.message); return; }
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        Archive this listing?
        <button type="button" onClick={run} disabled={pending} className="rounded-full bg-destructive px-2.5 py-1 font-semibold text-destructive-foreground disabled:opacity-60">Yes</button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-full border px-2.5 py-1 font-semibold">No</button>
        {error && <span className="text-destructive">{error}</span>}
      </span>
    );
  }
  return <button type="button" onClick={() => setConfirming(true)} className="text-sm font-semibold text-destructive underline">Archive</button>;
}

export function UnarchiveButton({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null);
          const res = await unarchiveCentre({ centreId });
          if (!res.ok) { setError(res.error.message); return; }
          router.refresh();
        })}
        className="rounded-full border px-2.5 py-1 font-semibold"
      >
        {pending ? 'Restoring…' : 'Restore to draft'}
      </button>
      {error && <span className="text-destructive">{error}</span>}
    </span>
  );
}

export function PublishToggle({ centreId, published }: { centreId: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null);
          const res = await setCentrePublished({ centreId, published: !published });
          if (!res.ok) { setError(res.error.message); return; }
          router.refresh();
        })}
        className="rounded-full border px-2.5 py-1 font-semibold"
      >
        {pending ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
      </button>
      {error && <span className="text-destructive">{error}</span>}
    </span>
  );
}
