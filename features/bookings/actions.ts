'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { ActionError, type Result } from '@/lib/result';
import { bookingSchema, cancelSchema, rescheduleSchema, waitlistSchema, availabilitySchema } from './schema';
import { priceForPeriod, PERIOD_DAYS } from './pricing';
import { notifyBooking } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date as seen in IST — plain toISOString() is UTC-based and can be
 * a day behind near midnight IST (e.g. 1 AM IST is still the previous UTC day). */
function todayISO(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Resolve the requested slot into a concrete start time: the chosen date +
 * chosen hour, for every period. Explicit '+05:30' (IST) offset — matching
 * resource_hour_slots' fix — so "8 AM" always means 8 AM India time
 * regardless of the server process's ambient timezone (Vercel runs UTC by
 * default; a bare date-time string with no offset would otherwise be parsed
 * as 8 AM UTC, i.e. 1:30 PM IST — a real bug found in testing).
 */
function resolveSlotStart(date: string | undefined, hour: number | undefined): Date {
  const d = date ?? todayISO();
  const h = hour ?? new Date().getHours();
  return new Date(`${d}T${String(h).padStart(2, '0')}:00:00+05:30`);
}

/**
 * Real-time slot availability — the same overlap check book_seat() enforces,
 * exposed read-only so the UI can show taken/free before the student commits
 * (movie-ticket style: grayed-out slots are genuinely unavailable, not a
 * guess). Period-aware: a day+ slot's "taken" count reflects bookings
 * overlapping that slot's full duration starting at that hour (a separate
 * pool from hourly walk-ins — see 0031's migration notes).
 */
export async function getResourceAvailability(raw: unknown) {
  return action(availabilitySchema, raw, async (input) => {
    const db = await createClient();

    const { data: resource } = await db.from('resources').select('centre_id').eq('id', input.resourceId).maybeSingle();
    let closed = false;
    if (resource) {
      const { data: openToday } = await db.rpc('centre_is_open_on', { p_centre_id: resource.centre_id, p_date: input.date });
      closed = openToday === false;
    }

    const { data, error } = await db.rpc('resource_hour_slots', {
      p_resource_id: input.resourceId, p_date: input.date, p_period: input.period,
    });
    if (error) throw error;
    return { slots: data ?? [], closed };
  });
}

/**
 * Create a booking. Prices come from priceForPeriod() (shared with the UI) —
 * never trusted from the client. Hourly bookings (one hour or several) go
 * through book_seat_multi, which creates one row per hour, all-or-nothing —
 * each hour is its own independent capacity bucket, so a 3-hour booking
 * (9, 10, 11 AM) correctly reduces each of those three hours' availability
 * independently, leaving 8 AM / 12 PM untouched. Day-or-longer periods use
 * book_seat as a single row spanning the period's real length.
 */
export async function createBooking(raw: unknown): Promise<Result<{ id: string; isGroup: boolean }>> {
  return action(bookingSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();

    const { data: resource } = await db
      .from('resources')
      .select('id, centre_id, pricing, is_active')
      .eq('id', input.resourceId)
      .maybeSingle();

    if (!resource || resource.centre_id !== input.centreId || !resource.is_active) {
      throw new ActionError('NOT_FOUND', 'That option is no longer available.');
    }

    const pricing = (resource.pricing ?? {}) as Record<string, number>;
    const date = input.date ?? todayISO();

    if (input.period === 'hour') {
      const hours = input.hours && input.hours.length ? input.hours : input.hour !== undefined ? [input.hour] : [];
      if (!hours.length) throw new ActionError('VALIDATION', 'Pick at least one time slot.');

      const perHour = priceForPeriod(pricing, 'hour');
      if (perHour === null) throw new ActionError('VALIDATION', 'This option can’t be booked hourly.');

      const { data, error } = await db.rpc('book_seat_multi', {
        p_centre_id: input.centreId,
        p_resource_id: input.resourceId,
        p_date: date,
        p_hours: hours,
        p_amount_per_hour: perHour,
      });
      if (error) {
        if (error.message.includes('RESOURCE_FULL'))
          throw new ActionError('CONFLICT', 'One of those hours just got booked by someone else. Please review and try again.');
        if (error.message.includes('RESOURCE_NOT_FOUND'))
          throw new ActionError('NOT_FOUND', 'That option is no longer available.');
        if (error.message.includes('CENTRE_CLOSED'))
          throw new ActionError('VALIDATION', 'This centre is closed on that day. Please pick another date.');
        throw error;
      }

      await notifyBooking(user.id, 'created');
      revalidatePath('/account');
      return { id: data as string, isGroup: true };
    }

    const amount = priceForPeriod(pricing, input.period);
    if (amount === null) throw new ActionError('VALIDATION', 'This option can’t be booked by that period.');

    const startsAt = resolveSlotStart(date, input.hour);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 5 * 60_000) {
      throw new ActionError('VALIDATION', 'Pick a valid, upcoming date and time.');
    }
    const days = PERIOD_DAYS[input.period] ?? 1;
    const endsAt = new Date(startsAt.getTime() + days * 86_400_000);

    // Atomic, capacity-checked booking. The DB function locks the resource row,
    // rejects if full, and inserts — preventing double-booking under concurrency.
    const { data, error } = await db.rpc('book_seat', {
      p_centre_id: input.centreId,
      p_resource_id: input.resourceId,
      p_period: input.period,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_amount: amount,
    });
    if (error) {
      // Map the DB guard's errors to friendly, typed failures.
      if (error.message.includes('RESOURCE_FULL'))
        throw new ActionError('CONFLICT', 'That slot just got booked by someone else. Please pick another.');
      if (error.message.includes('RESOURCE_NOT_FOUND'))
        throw new ActionError('NOT_FOUND', 'That option is no longer available.');
      if (error.message.includes('CENTRE_CLOSED'))
        throw new ActionError('VALIDATION', 'This centre is closed on that day. Please pick another date.');
      throw error;
    }

    await notifyBooking(user.id, 'created'); // in-app only; email follows on payment
    revalidatePath('/account');
    return { id: data as string, isGroup: false };
  });
}

// ── Lifecycle actions ───────────────────────────────────────────────────────

/** Cancel a booking. Authorization + capacity release + audit + waitlist
 * promotion all happen atomically in the `cancel_booking` DB function. */
export async function cancelBooking(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(cancelSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { error } = await db.rpc('cancel_booking', {
      p_booking_id: input.bookingId,
      p_reason: input.reason ?? '',
    });
    if (error) {
      if (error.message.includes('PAST_CUTOFF')) throw new ActionError('CONFLICT', 'The cancellation cutoff for this booking has passed.');
      if (error.message.includes('FORBIDDEN')) throw new ActionError('FORBIDDEN', 'You can’t cancel this booking.');
      if (error.message.includes('INVALID_STATE')) throw new ActionError('CONFLICT', 'This booking can no longer be cancelled.');
      if (error.message.includes('NOT_FOUND')) throw new ActionError('NOT_FOUND', 'Booking not found.');
      throw error;
    }
    // Notify the user their cancellation went through (in-app + email).
    await notifyBooking(user.id, 'cancelled', { email: await getUserEmail(user.id) });
    revalidatePath('/account');
    return { ok: true as const };
  });
}

/** Reschedule: book the new slot first (capacity-checked), then cancel the old
 * one — so a failed move never loses the original seat. */
export async function rescheduleBooking(raw: unknown): Promise<Result<{ id: string; isGroup: boolean }>> {
  return action(rescheduleSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();

    const { data: old } = await db.from('bookings')
      .select('id, centre_id, resource_id, period, amount, status, user_id, booking_group_id')
      .eq('id', input.bookingId).maybeSingle();
    if (!old || old.user_id !== user.id) throw new ActionError('NOT_FOUND', 'Booking not found.');
    if (!['pending', 'confirmed'].includes(old.status)) throw new ActionError('CONFLICT', 'This booking can’t be rescheduled.');

    const startsAt = new Date(input.startsAt);

    // Every hourly booking — one hour or many — is created by
    // book_seat_multi() and always carries a booking_group_id (see 0031/0034).
    // Rescheduling it must move the WHOLE group together (same duration,
    // same seat-count), not just the one row this booking id happens to
    // point at — otherwise the other hours silently detach from the group.
    if (old.period === 'hour') {
      if (!old.booking_group_id) throw new ActionError('INTERNAL', 'This booking is missing its group reference.');
      const { data: groupId, error: groupErr } = await db.rpc('reschedule_booking_group', {
        p_booking_group_id: old.booking_group_id,
        p_new_starts_at: startsAt.toISOString(),
      });
      if (groupErr) {
        if (groupErr.message.includes('RANGE_UNAVAILABLE'))
          throw new ActionError('CONFLICT', 'Selected time range is not fully available.');
        if (groupErr.message.includes('CENTRE_CLOSED'))
          throw new ActionError('VALIDATION', 'This centre is closed on that day. Please pick another date.');
        if (groupErr.message.includes('RESOURCE_NOT_FOUND'))
          throw new ActionError('NOT_FOUND', 'That option is no longer available.');
        throw groupErr;
      }
      await notifyBooking(user.id, 'rescheduled', { email: await getUserEmail(user.id) });
      revalidatePath('/account');
      return { id: groupId as string, isGroup: true };
    }

    // Day+ (Daily/Weekly/Fortnightly/Monthly/Quarterly/Half-yearly/Yearly):
    // a single row, unchanged from before.
    const days = PERIOD_DAYS[old.period as keyof typeof PERIOD_DAYS] ?? 1;
    const endsAt = new Date(startsAt.getTime() + days * 86_400_000);

    // 1. Acquire the new slot (atomic capacity check).
    const { data: newId, error: bookErr } = await db.rpc('book_seat', {
      p_centre_id: old.centre_id, p_resource_id: old.resource_id, p_period: old.period,
      p_starts_at: startsAt.toISOString(), p_ends_at: endsAt.toISOString(), p_amount: old.amount,
    });
    if (bookErr) {
      if (bookErr.message.includes('RESOURCE_FULL')) throw new ActionError('CONFLICT', 'No seat available at the new time.');
      throw bookErr;
    }

    // 2. Only now release the old one, tagging history.
    const { error: cancelErr } = await db.rpc('cancel_booking', { p_booking_id: old.id, p_reason: 'rescheduled' });
    if (cancelErr) throw cancelErr;
    await db.from('bookings').update({ rescheduled_from: old.id }).eq('id', newId as string);

    await notifyBooking(user.id, 'rescheduled', { email: await getUserEmail(user.id) });
    revalidatePath('/account');
    return { id: newId as string, isGroup: false };
  });
}

/** Join the waitlist for a full resource. */
export async function joinWaitlist(raw: unknown): Promise<Result<{ id: string }>> {
  return action(waitlistSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();
    const { data, error } = await db.from('waitlist_entries')
      .insert({ resource_id: input.resourceId, user_id: user.id, period: input.period, status: 'waiting' })
      .select('id').single();
    if (error) {
      if (error.code === '23505') throw new ActionError('CONFLICT', 'You’re already on the waitlist for this option.');
      throw error;
    }
    return { id: data.id };
  });
}
