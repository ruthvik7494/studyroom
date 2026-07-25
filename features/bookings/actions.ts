'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { ActionError, type Result, err, ok } from '@/lib/result';
import { bookingSchema, cancelSchema, rescheduleSchema, waitlistSchema, availabilitySchema } from './schema';
import { notifyBooking } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';

/** Period → duration in ms, used for 'day'/'month' (hour bookings use the exact chosen slot). */
const PERIOD_MS: Record<string, number> = { hour: 3_600_000, day: 86_400_000, month: 2_592_000_000 };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Resolve the requested slot into a concrete start time. Hourly bookings use
 * the exact chosen date+hour; day/month bookings start at the centre's
 * opening time (booking_rules) on the chosen date, defaulting to midnight if
 * the centre hasn't configured hours.
 */
async function resolveSlotStart(
  db: Awaited<ReturnType<typeof createClient>>,
  centreId: string,
  period: 'hour' | 'day' | 'month',
  date?: string,
  hour?: number,
): Promise<Date> {
  const d = date ?? todayISO();
  if (period === 'hour') {
    const h = hour ?? new Date().getHours();
    return new Date(`${d}T${String(h).padStart(2, '0')}:00:00`);
  }
  const { data: rules } = await db.from('booking_rules').select('opening_time').eq('centre_id', centreId).maybeSingle();
  const opening = rules?.opening_time ?? '00:00:00';
  return new Date(`${d}T${opening}`);
}

/**
 * Real-time slot availability — the same overlap check book_seat() enforces,
 * exposed read-only so the UI can show taken/free before the student commits
 * (movie-ticket style: grayed-out slots are genuinely unavailable, not a guess).
 */
export async function getResourceAvailability(raw: unknown) {
  return action(availabilitySchema, raw, async (input) => {
    const db = await createClient();
    if (input.period === 'hour') {
      const { data, error } = await db.rpc('resource_hour_slots', { p_resource_id: input.resourceId, p_date: input.date });
      if (error) throw error;
      return { kind: 'hourly' as const, slots: data ?? [] };
    }
    const { data, error } = await db.rpc('resource_day_availability', {
      p_resource_id: input.resourceId, p_date: input.date, p_period: input.period,
    });
    if (error) throw error;
    const row = data?.[0];
    return { kind: 'single' as const, taken: row?.taken ?? 0, capacity: row?.capacity ?? 0, isAvailable: row?.is_available ?? false };
  });
}

/**
 * Create a booking. Prices from the resource's pricing json (server-side — the
 * client never sends the amount). RLS requires user_id = auth.uid(). The slot
 * (date + hour, for hourly bookings) comes from the student's own selection on
 * the booking page — see resolveSlotStart above — instead of always "now".
 */
export async function createBooking(raw: unknown): Promise<Result<{ id: string }>> {
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
    const amount = pricing[input.period];
    if (typeof amount !== 'number') throw new ActionError('VALIDATION', 'This option can’t be booked by that period.');

    const startsAt = await resolveSlotStart(db, input.centreId, input.period, input.date, input.hour);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 5 * 60_000) {
      throw new ActionError('VALIDATION', 'Pick a valid, upcoming date and time.');
    }
    const endsAt = new Date(
      input.period === 'hour' ? startsAt.getTime() + 3_600_000 : startsAt.getTime() + (PERIOD_MS[input.period] ?? 0),
    );

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
      throw error;
    }

    await notifyBooking(user.id, 'created'); // in-app only; email follows on payment
    revalidatePath('/account');
    return { id: data as string };
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
export async function rescheduleBooking(raw: unknown): Promise<Result<{ id: string }>> {
  return action(rescheduleSchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();

    const { data: old } = await db.from('bookings')
      .select('id, centre_id, resource_id, period, amount, status, user_id')
      .eq('id', input.bookingId).maybeSingle();
    if (!old || old.user_id !== user.id) throw new ActionError('NOT_FOUND', 'Booking not found.');
    if (!['pending', 'confirmed'].includes(old.status)) throw new ActionError('CONFLICT', 'This booking can’t be rescheduled.');

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(startsAt.getTime() + (PERIOD_MS[old.period] ?? 0));

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
    return { id: newId as string };
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
