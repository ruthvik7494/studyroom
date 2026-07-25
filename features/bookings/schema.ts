import { z } from 'zod';

export const bookingSchema = z.object({
  centreId: z.string().uuid(),
  resourceId: z.string().uuid(),
  period: z.enum(['hour', 'day', 'month']),
  /** YYYY-MM-DD — the slot's date. Defaults to today server-side if omitted. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional(),
  /** 0–23 — required for hourly bookings, ignored for day/month. */
  hour: z.coerce.number().int().min(0).max(23).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const availabilitySchema = z.object({
  resourceId: z.string().uuid(),
  period: z.enum(['hour', 'day', 'month']),
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
  period: z.enum(['hour', 'day', 'month']),
});

export const refundSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive().optional(), // omitted = full refund
  reason: z.string().max(500).optional(),
});
