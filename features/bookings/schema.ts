import { z } from 'zod';

const PERIOD_ENUM = z.enum(['hour', 'day', 'week', 'fortnight', 'month', 'quarter', 'half_year', 'year']);

export const bookingSchema = z.object({
  centreId: z.string().uuid(),
  resourceId: z.string().uuid(),
  period: PERIOD_ENUM,
  /** YYYY-MM-DD — the slot's date. Defaults to today server-side if omitted. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional(),
  /** 0–23 — the single start hour, for any period that isn't a multi-hour Hourly booking. */
  hour: z.coerce.number().int().min(0).max(23).optional(),
  /** For Hourly bookings only: one or more specific hours (e.g. [9,10,11] for a 3-hour booking). */
  hours: z.array(z.coerce.number().int().min(0).max(23)).min(1).max(24).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const availabilitySchema = z.object({
  resourceId: z.string().uuid(),
  period: PERIOD_ENUM,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
});

export const cancelSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const rescheduleSchema = z.object({
  bookingId: z.string().uuid(),
  startsAt: z.string().datetime(),
});

export const waitlistSchema = z.object({
  resourceId: z.string().uuid(),
  period: PERIOD_ENUM,
});

export const refundSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive().optional(), // omitted = full refund
  reason: z.string().max(500).optional(),
});
