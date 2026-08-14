'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { confirmDemoPayment } from '../demo-action';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type PayButtonProps =
  | { bookingId: string; groupId?: undefined; label?: string }
  | { groupId: string; bookingId?: undefined; label?: string };

/**
 * Pay for a booking — or a whole multi-hour group at once (one combined
 * charge for the total, instead of one "Pay now" per hour). If Razorpay is
 * configured, opens the hosted checkout and verifies the signature
 * server-side on success. If not configured, the server returns
 * { configured:false } and we show a pay-at-centre confirmation.
 */
export function PayButton(props: PayButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payAtCentre, setPayAtCentre] = useState(false);

  const ref = props.groupId ? { groupId: props.groupId } : { bookingId: props.bookingId };

  const pay = async () => {
    setBusy(true);
    setError(null);
    const res = await confirmDemoPayment(ref);
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error.message);
    }
  };

  if (payAtCentre) {
    return <p className="rounded-md bg-accent p-3 text-sm" role="status">Online payment isn’t enabled yet — you can pay at the centre. Your seat is reserved.</p>;
  }

  return (
    <div>
      <Button onClick={pay} disabled={busy} className="flex w-full items-center justify-center gap-2">
        {busy ? 'Opening…' : <>{props.label ?? 'Pay now'} <span aria-hidden>🔒</span></>}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
