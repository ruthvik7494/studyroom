import { z } from 'zod';

export const reviewRefundSchema = z.object({
  refundId: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().max(500).optional(),
});

export const completeRefundSchema = z.object({
  refundId: z.string().uuid(),
  razorpayRefundId: z.string().max(120).optional(),
});
