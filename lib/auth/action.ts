import 'server-only';
import { ZodError, type ZodSchema } from 'zod';
import { AuthError } from '@/lib/auth/rbac';
import { type Result, ok, err, ActionError } from '@/lib/result';

/**
 * Wraps a Server Action body so every action has uniform validation + error
 * handling and always returns a typed Result<T> instead of throwing across the
 * RSC boundary. Validates raw input against a Zod schema first.
 */
export async function action<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  raw: unknown,
  run: (input: TInput) => Promise<TOutput>,
): Promise<Result<TOutput>> {
  let input: TInput;
  try {
    input = schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      return err('VALIDATION', 'Please check the highlighted fields.', e.flatten().fieldErrors as Record<string, string[]>);
    }
    return err('VALIDATION', 'Invalid input.');
  }

  try {
    return ok(await run(input));
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.code === 'UNAUTHENTICATED') return err('UNAUTHENTICATED', 'Please sign in to continue.');
      if (e.code === 'SUSPENDED') return err('FORBIDDEN', 'Your account has been suspended. Contact support if you think this is a mistake.');
      return err('FORBIDDEN', 'You do not have permission to do that.');
    }
    if (e instanceof ActionError) {
      return err(e.code, e.message, e.fields);
    }
    console.error('[action] unhandled', e);
    return err('INTERNAL', 'Something went wrong. Please try again.');
  }
}
