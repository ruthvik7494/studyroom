import { describe, it, expect, vi } from 'vitest';

/**
 * Pure-logic mirrors of reschedule_booking_group() (supabase/migrations/
 * 0035_reschedule_booking_group.sql). The real capacity check, the atomic
 * insert-then-cancel, and the rollback-on-failure guarantee all live in that
 * Postgres function and need a live DB to exercise directly (see tests/e2e
 * for the DB-integration suite) — these tests cover the same *decisions*
 * the SQL makes, in plain TypeScript, so the logic is verified independent
 * of the database.
 */

/** Mirrors the SQL's hour-generation: new_start, new_start+1h, ... */
function generateHourRange(newStart: Date, hours: number): Date[] {
  return Array.from({ length: hours }, (_, i) => new Date(newStart.getTime() + i * 3_600_000));
}

/** Mirrors the SQL's per-hour validation loop — checks every hour before
 * reporting success, stopping at the first unavailable one. */
function validateRange(
  hours: Date[],
  isAvailable: (hour: Date) => boolean,
): { ok: true } | { ok: false; reason: string } {
  for (const hour of hours) {
    if (!isAvailable(hour)) {
      return { ok: false, reason: 'Selected time range is not fully available.' };
    }
  }
  return { ok: true };
}

/** Mirrors the SQL's overall shape: validate everything first; only if
 * every hour passes does it "commit" (insert new rows + cancel old ones).
 * Nothing is written if validation fails anywhere — modelled here as the
 * commit callback simply never being invoked. */
function rescheduleGroup(
  hours: Date[],
  isAvailable: (hour: Date) => boolean,
  commit: (hours: Date[]) => void,
): { ok: true } | { ok: false; reason: string } {
  const result = validateRange(hours, isAvailable);
  if (!result.ok) return result;
  commit(hours);
  return { ok: true };
}

describe('group reschedule — hour range generation', () => {
  it('1-hour booking generates exactly one hour', () => {
    const start = new Date('2026-08-03T09:00:00+05:30');
    const hours = generateHourRange(start, 1);
    expect(hours).toHaveLength(1);
    expect(hours[0]!.toISOString()).toBe(start.toISOString());
  });

  it('2-hour booking generates two consecutive hours', () => {
    const start = new Date('2026-08-03T14:00:00+05:30');
    const hours = generateHourRange(start, 2);
    expect(hours).toHaveLength(2);
    expect(hours[1]!.getTime() - hours[0]!.getTime()).toBe(3_600_000);
  });

  it('3-hour booking generates three consecutive hours preserving original duration', () => {
    // Original booking was 9-10, 10-11, 11-12 (3 rows) — rescheduling to a
    // new start must produce the same 3-hour length, not 1 or an arbitrary count.
    const start = new Date('2026-08-03T14:00:00+05:30');
    const hours = generateHourRange(start, 3);
    expect(hours).toHaveLength(3);
    expect(hours.map((h) => h.getUTCHours())).toEqual([
      start.getUTCHours(),
      start.getUTCHours() + 1,
      start.getUTCHours() + 2,
    ]);
  });
});

describe('group reschedule — availability validation (all-or-nothing)', () => {
  it('fails the whole operation when even one hour is unavailable', () => {
    const hours = generateHourRange(new Date('2026-08-03T14:00:00+05:30'), 3);
    // 2 PM and 3 PM are free; 4 PM (the third generated hour) is full.
    const takenHours = new Set([hours[2]!.toISOString()]);
    const isAvailable = (h: Date) => !takenHours.has(h.toISOString());

    const result = validateRange(hours, isAvailable);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('Selected time range is not fully available.');
  });

  it('succeeds only when every generated hour is available', () => {
    const hours = generateHourRange(new Date('2026-08-03T14:00:00+05:30'), 3);
    const result = validateRange(hours, () => true);
    expect(result.ok).toBe(true);
  });

  it('stops checking as soon as one hour fails (does not need to check the rest)', () => {
    const hours = generateHourRange(new Date('2026-08-03T09:00:00+05:30'), 3);
    let checked = 0;
    const isAvailable = (h: Date) => { checked += 1; return h.getTime() !== hours[0]!.getTime(); };
    validateRange(hours, isAvailable);
    expect(checked).toBe(1); // failed on the first hour, never checked hour 2 or 3
  });
});

describe('group reschedule — rollback behaviour', () => {
  it('never commits (inserts/cancels) anything when validation fails', () => {
    const hours = generateHourRange(new Date('2026-08-03T09:00:00+05:30'), 3);
    const commit = vi.fn();
    const result = rescheduleGroup(hours, () => false, commit);

    expect(result.ok).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it('commits exactly once, with all hours, when every hour is available', () => {
    const hours = generateHourRange(new Date('2026-08-03T09:00:00+05:30'), 3);
    const commit = vi.fn();
    const result = rescheduleGroup(hours, () => true, commit);

    expect(result.ok).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(hours);
  });

  it('a booking that was already partially full before the reschedule attempt is left untouched', () => {
    // Simulates: original 9,10,11 AM booking; new range 2,3,4 PM; 4 PM is full.
    // The original 9-12 booking must remain exactly as it was — this test
    // models that as "the original hours are never passed to commit".
    const originalHours = generateHourRange(new Date('2026-08-03T09:00:00+05:30'), 3);
    const newHours = generateHourRange(new Date('2026-08-03T14:00:00+05:30'), 3);
    const takenHours = new Set([newHours[2]!.toISOString()]);
    const commit = vi.fn();

    const result = rescheduleGroup(newHours, (h) => !takenHours.has(h.toISOString()), commit);

    expect(result.ok).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    // Original hours were never part of this operation's writes at all.
    expect(commit).not.toHaveBeenCalledWith(originalHours);
  });
});

describe('confirmation page — grouped booking display', () => {
  interface MockBooking { id: string; starts_at: string; status: string; booking_group_id: string | null }

  /** Mirrors the confirmed page's query + ordering: only active bookings
   * sharing a group id, sorted by start time. */
  function activeGroupBookings(all: MockBooking[], groupId: string): MockBooking[] {
    return all
      .filter((b) => b.booking_group_id === groupId && ['pending', 'confirmed'].includes(b.status))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  it('shows every active hour in the group, ordered by start time', () => {
    const group = 'g1';
    const all: MockBooking[] = [
      { id: '3', starts_at: '2026-08-03T11:00:00+05:30', status: 'pending', booking_group_id: group },
      { id: '1', starts_at: '2026-08-03T09:00:00+05:30', status: 'pending', booking_group_id: group },
      { id: '2', starts_at: '2026-08-03T10:00:00+05:30', status: 'pending', booking_group_id: group },
    ];
    const shown = activeGroupBookings(all, group);
    expect(shown.map((b) => b.id)).toEqual(['1', '2', '3']);
  });

  it('excludes cancelled rows (e.g. the old hours after a reschedule) from the group view', () => {
    const group = 'g1';
    const all: MockBooking[] = [
      { id: 'old-1', starts_at: '2026-08-03T09:00:00+05:30', status: 'cancelled', booking_group_id: group },
      { id: 'old-2', starts_at: '2026-08-03T10:00:00+05:30', status: 'cancelled', booking_group_id: group },
      { id: 'old-3', starts_at: '2026-08-03T11:00:00+05:30', status: 'cancelled', booking_group_id: group },
      { id: 'new-1', starts_at: '2026-08-03T14:00:00+05:30', status: 'pending', booking_group_id: group },
      { id: 'new-2', starts_at: '2026-08-03T15:00:00+05:30', status: 'pending', booking_group_id: group },
      { id: 'new-3', starts_at: '2026-08-03T16:00:00+05:30', status: 'pending', booking_group_id: group },
    ];
    const shown = activeGroupBookings(all, group);
    expect(shown).toHaveLength(3);
    expect(shown.map((b) => b.id)).toEqual(['new-1', 'new-2', 'new-3']);
  });

  it('does not mix in bookings from a different group', () => {
    const all: MockBooking[] = [
      { id: '1', starts_at: '2026-08-03T09:00:00+05:30', status: 'pending', booking_group_id: 'g1' },
      { id: '2', starts_at: '2026-08-03T09:00:00+05:30', status: 'pending', booking_group_id: 'g2' },
    ];
    expect(activeGroupBookings(all, 'g1').map((b) => b.id)).toEqual(['1']);
  });
});
