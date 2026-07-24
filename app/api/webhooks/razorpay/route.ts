import { NextResponse, type NextRequest } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { notifyBooking } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * Razorpay webhook — server-authoritative payment confirmation.
 * Verifies the signature, dedupes on event id (webhook_events), and marks the
 * booking paid. Runs with the service-role client (bypasses RLS) precisely
 * because it's an untrusted external caller we've cryptographically verified.
 */
export async function POST(req: NextRequest) {
  // Rate-limited per charter §Reliability ("wrap ... webhooks with rateLimit()").
  // Generous ceiling — legitimate Razorpay traffic can burst on retries — this
  // exists to blunt a flood of forged requests hammering signature
  // verification, not to throttle real deliveries.
  const limited = !(await rateLimit(clientKey(req.headers, 'webhook:razorpay'), 120, 60_000)).success;
  if (limited) return NextResponse.json({ error: 'rate limited' }, { status: 429 });

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } } } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }

  // Idempotency: Razorpay's own `x-razorpay-event-id` header is the documented,
  // unique-per-delivery id (see Razorpay webhook FAQs/validate-test docs) — use
  // it instead of the signature, which is only guaranteed unique per distinct
  // payload+secret, not per delivery. Fall back to the signature only if the
  // header is ever absent (older Razorpay integrations / local testing).
  const eventId = req.headers.get('x-razorpay-event-id') ?? signature;
  const { error: dupeErr } = await admin.from('webhook_events').insert({ id: eventId, provider: 'razorpay' });
  if (dupeErr) return NextResponse.json({ ok: true, deduped: true }); // already processed

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    if (orderId) {
      // Guard on status so the confirmation notification fires exactly once,
      // whether the webhook or the checkout-confirm action wins the race.
      const { data: updated } = await admin
        .from('bookings')
        .update({ payment: 'paid', status: 'confirmed', razorpay_payment_id: paymentId ?? null })
        .eq('razorpay_order_id', orderId)
        .neq('status', 'confirmed')
        .select('user_id');
      const first = updated?.[0];
      if (first) {
        const email = await getUserEmail(first.user_id);
        await notifyBooking(first.user_id, 'confirmed', { email });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
