'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emailOnlySchema, type EmailOnly } from '../schema';
import { requestPasswordReset } from '../actions';

/** Standard Google "G" mark, per Google's own brand SVG for sign-in buttons. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

export function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<EmailOnly>({ resolver: zodResolver(emailOnlySchema) });

  const onSubmit = async (values: EmailOnly) => { await requestPasswordReset(values); setSent(true); };

  const google = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand mark — same as /login, so this reads as one connected flow */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
          S
        </div>
        <div>
          <p className="font-display text-lg font-extrabold leading-tight">Study<span className="text-brand-gold">Nook</span></p>
          <p className="text-xs leading-tight text-muted-foreground">Find. Book. Study.</p>
        </div>
      </div>

      <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
        Reset your password <span aria-hidden>🔒</span>
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter your email address and we&apos;ll send you a link to set a new password.
      </p>

      {sent ? (
        // Always the same confirmation regardless of whether the email
        // exists — don't reveal account existence either way.
        <p className="mt-6 rounded-xl bg-accent p-4 text-sm" role="status">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">Email address</label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><MailIcon /></span>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                aria-label="Email address"
                aria-invalid={!!errors.email}
                className="h-12 rounded-xl pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="h-12 w-full gap-2 rounded-xl text-base" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : <>Send reset link <span aria-hidden>→</span></>}
          </Button>
        </form>
      )}

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="h-12 w-full gap-2 rounded-xl" onClick={google} type="button">
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Remembered your password? <a href="/login" className="font-semibold text-primary hover:underline">Sign in</a>
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>🛡</span>
        Your data is secure with us. We never share your information.
      </div>
    </div>
  );
}
