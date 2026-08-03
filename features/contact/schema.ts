import { z } from 'zod';

const nameField = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}`).max(80)
    .regex(/^[A-Za-z][A-Za-z .'-]*$/, `${label[0]!.toUpperCase()}${label.slice(1)} can only contain letters`);

export const contactSchema = z.object({
  firstName: nameField('first name'),
  lastName: nameField('last name'),
  email: z.string().trim().min(1, 'Enter your email').max(200).email('Enter a valid email address'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Tell us a bit more').max(2000),
  agreePrivacy: z.literal(true, { errorMap: () => ({ message: 'Please agree to the privacy policy' }) }),
});
export type ContactInput = z.infer<typeof contactSchema>;
