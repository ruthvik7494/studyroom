'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Ticks down to `expiresAt`; once it reaches zero, refreshes the page so the
 * server-side expiry sweep (see the confirmation page) runs and the student
 * sees the reservation actually flip to "Reservation Expired" live, instead
 * of a countdown that silently stops meaning anything at 0:00. */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0 && !refreshed) {
        setRefreshed(true);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [target, refreshed, router]);

  if (remaining <= 0) {
    return <span>Checking reservation status…</span>;
  }

  return (
    <span>
      Pay within <span className="font-mono font-bold">{formatRemaining(remaining)}</span> or the seat is released.
    </span>
  );
}
