import { z } from 'zod';

/** Moderation decisions on a listing. */
export const moderateCentreSchema = z.object({
  centreId: z.string().uuid(),
  decision: z.enum(['approve', 'reject', 'suspend', 'restore', 'archive']),
  reason: z.string().trim().max(500).optional(),
});
export type ModerateCentre = z.infer<typeof moderateCentreSchema>;

/** Moderation on a review. */
export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  decision: z.enum(['publish', 'remove']),
});
export type ModerateReview = z.infer<typeof moderateReviewSchema>;

export const resolveReportSchema = z.object({ reportId: z.string().uuid() });
export type ResolveReport = z.infer<typeof resolveReportSchema>;

/** Claim moderation. */
export const moderateClaimSchema = z.object({
  claimId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
});
export type ModerateClaim = z.infer<typeof moderateClaimSchema>;

/** Admin changing a user's role. */
export const setUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['student', 'owner', 'admin']),
});
export type SetUserRole = z.infer<typeof setUserRoleSchema>;

/** Admin suspending/reactivating a user account. */
export const setAccountStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
});
export type SetAccountStatus = z.infer<typeof setAccountStatusSchema>;

export const reviewDeletionRequestSchema = z.object({
  requestId: z.string().uuid(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});
export type ReviewDeletionRequest = z.infer<typeof reviewDeletionRequestSchema>;
