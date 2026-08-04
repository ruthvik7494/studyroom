import { z } from 'zod';

export const deletionRequestSchema = z.object({
  reason: z.string().trim().max(500, 'Keep it under 500 characters').optional().or(z.literal('')),
});
export type DeletionRequestInput = z.infer<typeof deletionRequestSchema>;
