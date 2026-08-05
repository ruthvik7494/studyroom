import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { sendEmail, getUserEmail } from '@/lib/email';

/** Booking lifecycle events that generate a notification + email. */
export type BookingEvent =
  | 'created' | 'confirmed' | 'cancelled' | 'refunded' | 'rescheduled' | 'completed' | 'no_show' | 'waitlist_promoted';

const COPY: Record<BookingEvent, { kind: string; title: string; body: string }> = {
  created: { kind: 'booking_created', title: 'Booking created', body: 'Your booking is reserved. Complete payment to confirm your seat.' },
  confirmed: { kind: 'booking_confirmed', title: 'Booking confirmed', body: 'Your booking is confirmed. See you there!' },
  cancelled: { kind: 'booking_cancelled', title: 'Booking cancelled', body: 'Your booking has been cancelled.' },
  refunded: { kind: 'booking_refunded', title: 'Refund processed', body: 'Your refund has been processed.' },
  rescheduled: { kind: 'booking_rescheduled', title: 'Booking rescheduled', body: 'Your booking has been moved to a new time.' },
  completed: { kind: 'booking_completed', title: 'Session complete', body: 'Thanks for studying with us — leave a review!' },
  no_show: { kind: 'booking_no_show', title: 'Marked as no-show', body: 'You were marked as a no-show for a recent booking.' },
  waitlist_promoted: { kind: 'waitlist_promoted', title: 'A seat opened up!', body: 'You can now book your waitlisted study space.' },
};

/**
 * Fire an in-app notification + email for a booking lifecycle event.
 * Fire-and-forget friendly (never throws): a notification hiccup must not fail
 * the booking mutation that triggered it. Uses the service-role client so it
 * works from any server context, and the existing email queue (degrades when
 * Resend isn't configured).
 */
export async function notifyBooking(
  userId: string,
  event: BookingEvent,
  opts?: { email?: string | null; url?: string },
): Promise<void> {
  const c = COPY[event];
  try {
    await admin.from('notifications').insert({
      user_id: userId, kind: c.kind, title: c.title, body: c.body, url: opts?.url ?? '/account',
    });
  } catch {
    /* in-app insert failed — non-fatal */
  }
  if (opts?.email) {
    void sendEmail({
      to: opts.email,
      template: c.kind,
      subject: c.title,
      html: `<p>${c.body}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${opts.url ?? '/account'}">View in StudyNook</a></p>`,
    });
  }
}

/**
 * Owner-facing copy for the same booking lifecycle events — the centre
 * owner previously got NO email for any of these (new booking, payment,
 * cancellation, refund, reschedule); they only found out by checking their
 * dashboard. This closes that gap.
 */
const OWNER_COPY: Record<BookingEvent, { kind: string; title: string; body: (student: string, centre: string) => string }> = {
  created: { kind: 'owner_booking_created', title: 'New booking received', body: (s, c) => `${s} just reserved a seat at ${c}. Payment is pending.` },
  confirmed: { kind: 'owner_booking_confirmed', title: 'Booking confirmed & paid', body: (s, c) => `${s}'s booking at ${c} is confirmed and paid.` },
  cancelled: { kind: 'owner_booking_cancelled', title: 'Booking cancelled', body: (s, c) => `${s} cancelled their booking at ${c}.` },
  refunded: { kind: 'owner_booking_refunded', title: 'Refund processed', body: (s, c) => `A refund was processed for ${s}'s booking at ${c}.` },
  rescheduled: { kind: 'owner_booking_rescheduled', title: 'Booking rescheduled', body: (s, c) => `${s} rescheduled their booking at ${c}.` },
  completed: { kind: 'owner_booking_completed', title: 'Session completed', body: (s, c) => `${s}'s session at ${c} is complete.` },
  no_show: { kind: 'owner_booking_no_show', title: 'Student no-show', body: (s, c) => `${s} was marked as a no-show at ${c}.` },
  waitlist_promoted: { kind: 'owner_waitlist_promoted', title: 'Waitlist seat claimed', body: (s, c) => `${s} claimed a seat off the waitlist at ${c}.` },
};

/** Tell a centre owner about a booking event at their centre (in-app + email). */
export async function notifyOwnerOfBooking(
  ownerId: string,
  event: BookingEvent,
  opts: { email?: string | null; studentName: string; centreName: string; url?: string },
): Promise<void> {
  const c = OWNER_COPY[event];
  const body = c.body(opts.studentName, opts.centreName);
  try {
    await admin.from('notifications').insert({
      user_id: ownerId, kind: c.kind, title: c.title, body, url: opts.url ?? '/owner/bookings',
    });
  } catch {
    /* in-app insert failed — non-fatal */
  }
  if (opts.email) {
    void sendEmail({
      to: opts.email,
      template: c.kind,
      subject: c.title,
      html: `<p>${body}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${opts.url ?? '/owner/bookings'}">View in StudyNook</a></p>`,
    });
  }
}

/**
 * Low-volume oversight email to every admin. Deliberately used sparingly
 * (financial/exception events only, e.g. refunds) — CC'ing admins on every
 * routine booking would drown their inbox on a busy marketplace. Fetches
 * fresh each call rather than caching, since who's an admin can change.
 */
export async function notifyAdmins(template: string, subject: string, html: string): Promise<void> {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
  await Promise.all(
    (admins ?? []).map(async (a) => {
      const email = await getUserEmail(a.id);
      if (email) void sendEmail({ to: email, template, subject, html });
    }),
  );
}

/** Listing moderation outcomes an owner is told about. */
export type CentreDecision = 'approve' | 'reject' | 'suspend';

const CENTRE_COPY: Record<CentreDecision, { kind: string; title: string; body: string }> = {
  approve: { kind: 'centre_approved', title: 'Your centre is live', body: 'Your listing has been approved and is now visible to students.' },
  reject: { kind: 'centre_rejected', title: 'Your centre needs changes', body: 'Your listing wasn’t approved yet.' },
  suspend: { kind: 'centre_suspended', title: 'Your centre was suspended', body: 'Your listing has been suspended and is no longer visible.' },
};

/**
 * Tell a centre owner the outcome of admin moderation (in-app + email).
 * Reuses the same notification infrastructure as booking events; never throws.
 */
export async function notifyCentreDecision(
  ownerId: string,
  decision: CentreDecision,
  opts?: { email?: string | null; centreName?: string; reason?: string | null },
): Promise<void> {
  const c = CENTRE_COPY[decision];
  const body = opts?.reason ? `${c.body} Reason: ${opts.reason}` : c.body;
  const title = opts?.centreName ? `${c.title}: ${opts.centreName}` : c.title;
  try {
    await admin.from('notifications').insert({
      user_id: ownerId, kind: c.kind, title, body, url: '/owner/centres',
    });
  } catch {
    /* in-app insert failed — non-fatal */
  }
  if (opts?.email) {
    void sendEmail({
      to: opts.email,
      template: c.kind,
      subject: title,
      html: `<p>${body}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/owner/centres">Manage your listing</a></p>`,
    });
  }
}
