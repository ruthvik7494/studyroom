import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(200),
});
export type NewsletterInput = z.infer<typeof newsletterSchema>;
