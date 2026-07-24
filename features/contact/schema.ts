import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name').max(80),
  email: z.string().trim().email('Enter a valid email').max(200),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Tell us a bit more').max(2000),
  agreePrivacy: z.literal(true, { errorMap: () => ({ message: 'Please agree to the privacy policy' }) }),
});
export type ContactInput = z.infer<typeof contactSchema>;
