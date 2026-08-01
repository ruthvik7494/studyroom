'use client';
import { useState, useTransition } from 'react';
import { toggleSaved } from '@/features/saved/actions';

export function SaveHeart({ centreId, initialSaved }: { centreId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const res = await toggleSaved({ centreId, save: next });
      if (!res.ok) setSaved(!next); // rollback
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={saved ? 'Remove from saved' : 'Save this centre'}
      aria-pressed={saved}
      className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-base shadow-sm backdrop-blur hover:bg-background"
    >
      <span aria-hidden className={saved ? 'text-destructive' : 'text-muted-foreground'}>{saved ? '♥' : '♡'}</span>
    </button>
  );
}
