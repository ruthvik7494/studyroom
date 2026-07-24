import { z } from 'zod';

/**
 * Complexity beyond bare length: requires at least one letter and one digit.
 * Deliberately not requiring symbols/mixed-case on top of that — NIST 800-63B
 * favors length and blocklists over composition rules, which mostly push
 * users toward predictable substitutions (`Password1!`) without adding real
 * entropy. This is the floor the milestone's "Password Complexity Validation"
 * checklist item calls for, not a maximal ruleset.
 */
const passwordComplexity = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'Too long') // bcrypt/Supabase practical ceiling
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number');

export const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'), // sign-IN only checks shape, not strength — the account's real password rules were enforced at sign-up
});
export type Credentials = z.infer<typeof credentialsSchema>;

/**
 * Sign-up needs a display name: handle_new_user() copies
 * raw_user_meta_data->>'full_name' into profiles.full_name. Without it, email
 * sign-ups have a null name forever (OAuth users get one from the provider).
 */
export const signUpSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: passwordComplexity,
  fullName: z.string().trim().min(2, 'Enter your name').max(80, 'Name is too long'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Profile fields a user may edit themselves. Role is never editable here. */
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(80, 'Name is too long'),
  phone: z.string().trim().max(20, 'Phone is too long').optional().or(z.literal('')),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const emailOnlySchema = z.object({ email: z.string().trim().email('Enter a valid email') });
export type EmailOnly = z.infer<typeof emailOnlySchema>;

export const newPasswordSchema = z.object({ password: passwordComplexity });

export const roleSchema = z.object({ role: z.enum(['student', 'owner']) });
export type RoleInput = z.infer<typeof roleSchema>;
