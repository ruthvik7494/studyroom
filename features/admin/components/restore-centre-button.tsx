'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { moderateCentre } from '../actions';

export function RestoreCentreButton({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      await moderateCentre({ centreId, decision: 'restore' });
      router.refresh();
    });
  };

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={run}>
      {pending ? 'Restoring…' : 'Restore'}
    </Button>
  );
}
