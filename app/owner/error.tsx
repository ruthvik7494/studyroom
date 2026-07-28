'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function OwnerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Also lands in Vercel's function logs, but printing it here means it's
    // visible in the browser console too, without needing to go dig through
    // a dashboard to find out what actually broke.
    console.error('[owner section error]', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center" role="alert">
      <p className="font-display font-semibold">Something went wrong</p>
      {error.message && <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>}
      {error.digest && <p className="mt-1 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button variant="outline" className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
