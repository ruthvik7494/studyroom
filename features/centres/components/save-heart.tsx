'use client';
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toggleSaved } from '@/features/saved/actions';

export function SaveHeart({ centreId, initialSaved }: { centreId: string; initialSaved: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const res = await toggleSaved({ centreId, save: next });
      if (!res.ok) {
        setSaved(!next); // rollback
        // Guests can see the heart on every card, same as the reference
        // design — but saving needs an account, so send them to log in
        // (and back to this exact page) instead of failing silently.
        if (res.error.code === 'UNAUTHENTICATED') router.push(`/login?next=${encodeURIComponent(pathname)}`);
      }
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
