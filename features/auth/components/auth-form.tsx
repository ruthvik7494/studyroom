'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { credentialsSchema, signUpSchema, type SignUpInput } from '../schema';
import { signInWithPassword, signUp, sendMagicLink, resendVerificationEmail } from '../actions';

type Mode = 'signin' | 'signup';

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

export function AuthForm({
  next = '/',
  initialError,
  offerResend = false,
}: {
  next?: string;
  /** Pre-filled error from a callback redirect (e.g. an expired verification link). */
  initialError?: string;
  /** Show a "resend verification email" action alongside initialError. */
  offerResend?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [notice, setNotice] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(initialError ?? null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Superset type: fullName is only required (and only shown) in signup mode.
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } =
    useForm<SignUpInput>({ resolver: zodResolver(mode === 'signup' ? signUpSchema : credentialsSchema) });

  const onSubmit = async (values: SignUpInput) => {
    setServerError(null); setNotice(null);
    if (mode === 'signin') {
      const res = await signInWithPassword({ email: values.email, password: values.password });
      if (!res.ok) { setServerError(res.error.message); return; }
      router.push(next); router.refresh();
    } else {
      const res = await signUp(values);
      if (!res.ok) { setServerError(res.error.message); return; }
      setNotice(res.data.needsVerification ? 'Check your email to confirm your account.' : 'Account created!');
      if (!res.data.needsVerification) { router.push('/onboarding'); router.refresh(); }
    }
  };

  const google = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  };

  const magicLink = async () => {
    setServerError(null); setNotice(null);
    const email = getValues('email');
    const parsed = credentialsSchema.pick({ email: true }).safeParse({ email });
    if (!parsed.success) { setServerError('Enter your email first.'); return; }
    const res = await sendMagicLink({ email });
    setNotice(res.ok ? 'Magic link sent — check your email.' : 'Could not send the link.');
  };

  const resend = async () => {
    const email = getValues('email');
    const parsed = credentialsSchema.pick({ email: true }).safeParse({ email });
    if (!parsed.success) { setServerError('Enter your email above, then tap resend.'); return; }
    setResendState('sending');
    await resendVerificationEmail({ email });
    setResendState('sent');
    setNotice('If that account needs verifying, a new link is on its way.');
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5 flex rounded-lg border p-1" role="tablist">
        {(['signin', 'signup'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m}
            className={`flex-1 rounded-md py-2 text-sm font-semibold ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => { setMode(m); setServerError(null); setNotice(null); }}>
            {m === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={google} type="button">
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {mode === 'signup' && (
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" type="text" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
            {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === 'signin' && <a href="/auth/reset" className="text-xs text-muted-foreground hover:underline">Forgot?</a>}
          </div>
          <Input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} aria-invalid={!!errors.password} {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}
        {offerResend && resendState !== 'sent' && (
          <button type="button" onClick={resend} disabled={resendState === 'sending'}
            className="text-xs text-muted-foreground hover:underline">
            {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
        {notice && <p className="text-sm text-brand-green" role="status">{notice}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <button onClick={magicLink} className="mt-3 w-full text-center text-xs text-muted-foreground hover:underline">
        Email me a magic link instead
      </button>
    </div>
  );
}
