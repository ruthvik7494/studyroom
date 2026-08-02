-- 0036_payment_failed_status.sql
--
-- The booking confirmation page needs to distinguish "payment hasn't been
-- attempted yet" from "a payment attempt genuinely failed" — but the
-- payment_status enum had no value for the latter, and the Razorpay webhook
-- never handled payment.failed events at all. A failed charge was
-- indistinguishable from a booking nobody had tried to pay for yet.

alter type payment_status add value if not exists 'failed';
