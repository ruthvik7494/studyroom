import { z } from 'zod';

/** Write-a-review form. Shared by RHF (client) and the server action. */
export const reviewSchema = z.object({
  centreId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, 'Pick a rating').max(5),
  body: z.string().trim().max(1000).optional().or(z.literal('')),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

/** Report-a-review form. */
export const reportSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.string().trim().min(3, 'Tell us what’s wrong').max(300),
});
export type ReportInput = z.infer<typeof reportSchema>;

/** Edit your own existing review. */
export const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, 'Pick a rating').max(5),
  body: z.string().trim().max(1000).optional().or(z.literal('')),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const deleteReviewSchema = z.object({ reviewId: z.string().uuid() });

/** Owner responding to a review on their centre. */
export const respondToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().trim().min(1, 'Write a response').max(1000),
});
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>;
