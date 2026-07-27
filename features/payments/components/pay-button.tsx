'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { startPayment, confirmPayment } from '../actions';

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
  | { bookingId: string; groupId?: undefined }
  | { groupId: string; bookingId?: undefined };

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
    setBusy(true); setError(null);
    const started = await startPayment(ref);
    if (!started.ok) { setBusy(false); setError(started.error.message); return; }

    if (!started.data.configured) { setBusy(false); setPayAtCentre(true); return; }

    const ok = await loadCheckout();
    if (!ok || !window.Razorpay) { setBusy(false); setError('Could not load the payment window.'); return; }

    const rzp = new window.Razorpay({
      key: started.data.keyId,
      order_id: started.data.orderId,
      amount: started.data.amount,
      currency: 'INR',
      name: 'StudyNook',
      description: props.groupId ? 'Study space booking (multiple hours)' : 'Study space booking',
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const res = await confirmPayment({
          ...ref,
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        });
        if (res.ok) router.refresh();
        else setError(res.error.message);
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.open();
    setBusy(false);
  };

  if (payAtCentre) {
    return <p className="rounded-md bg-accent p-3 text-sm" role="status">Online payment isn’t enabled yet — you can pay at the centre. Your seat is reserved.</p>;
  }

  return (
    <div>
      <Button onClick={pay} disabled={busy}>{busy ? 'Opening…' : 'Pay now'}</Button>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
