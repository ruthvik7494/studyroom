import { z } from 'zod';

/**
 * Enquiry (contact-a-centre) form. ONE schema, used by React Hook Form on the
 * client AND re-parsed server-side — so validation can never be bypassed.
 */
export const enquirySchema = z.object({
  centreId: z.string().uuid(),
  name: z.string().trim().min(2, 'Please enter your name').max(80)
    .regex(/^[A-Za-z][A-Za-z .'-]*$/, 'Name can only contain letters'),
  email: z.string().trim().min(1, 'Enter your email').max(200).email('Enter a valid email address'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Message is a little short').max(1000),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;
