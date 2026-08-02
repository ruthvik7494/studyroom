'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateReview, deleteReview } from '../actions';

export function ReviewActions({ reviewId, rating, body }: { reviewId: string; rating: number; body: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [newRating, setNewRating] = useState(rating);
  const [newBody, setNewBody] = useState(body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (mode === 'view') {
    return (
      <span className="flex gap-3 text-xs">
        <button type="button" onClick={() => setMode('edit')} className="font-semibold text-primary hover:underline">Edit</button>
        <button type="button" onClick={() => setMode('confirmDelete')} className="font-semibold text-destructive hover:underline">Delete</button>
      </span>
    );
  }

  if (mode === 'confirmDelete') {
    return (
      <span className="flex items-center gap-2 text-xs">
        Delete this review?
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => {
            const res = await deleteReview({ reviewId });
            if (!res.ok) { setError(res.error.message); return; }
            router.refresh();
          })}
          className="rounded-full bg-destructive px-2.5 py-1 font-semibold text-destructive-foreground disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button type="button" onClick={() => setMode('view')} className="rounded-full border px-2.5 py-1 font-semibold">Cancel</button>
        {error && <span className="text-destructive">{error}</span>}
      </span>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setNewRating(n)} aria-label={`${n} star`} className="text-lg">
            {n <= newRating ? '★' : '☆'}
          </button>
        ))}
      </div>
      <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => {
            setError(null);
            const res = await updateReview({ reviewId, rating: newRating, body: newBody });
            if (!res.ok) { setError(res.error.message); return; }
            setMode('view');
            router.refresh();
          })}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => setMode('view')} className="rounded-full border px-3 py-1.5 text-xs font-semibold">Cancel</button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
