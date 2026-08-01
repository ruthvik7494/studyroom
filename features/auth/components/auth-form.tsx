'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M9.4 5.5A10.6 10.6 0 0 1 12 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.3 6.9C4.4 8.1 3 9.9 1.5 12c1.5 3 5.5 7 10.5 7 1.4 0 2.7-.3 3.9-.8" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7Z" />
      <circle cx="12" cy="12" r="3" />
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="w-full max-w-md">
      {/* Brand mark */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
          S
        </div>
        <div>
          <p className="font-display text-lg font-extrabold leading-tight">Study<span className="text-brand-gold">Nook</span></p>
          <p className="text-xs leading-tight text-muted-foreground">Find. Book. Study.</p>
        </div>
      </div>

      <h1 className="font-display text-2xl font-bold">
        {mode === 'signin' ? 'Welcome back! 👋' : 'Create your account'}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {mode === 'signin' ? 'Glad to see you again. Please sign in to continue.' : 'Just a few details to get started.'}
      </p>

      {/* Sign in / Sign up toggle — same functionality, pill styling */}
      <div className="mt-6 flex rounded-full border bg-secondary/50 p-1" role="tablist">
        {(['signin', 'signup'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button"
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => { setMode(m); setServerError(null); setNotice(null); }}>
            {m === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <Button variant="outline" className="mt-6 h-12 w-full gap-2 rounded-xl" onClick={google} type="button">
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or continue with email <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        {mode === 'signup' && (
          <div>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><MailIcon /></span>
              <Input id="fullName" type="text" autoComplete="name" placeholder="Your full name" aria-label="Full name" aria-invalid={!!errors.fullName} className="h-12 rounded-xl pl-10" {...register('fullName')} />
            </div>
            {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email address</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><MailIcon /></span>
            <Input id="email" type="email" autoComplete="email" placeholder="Enter your email address" aria-label="Email address" aria-invalid={!!errors.email} className="h-12 rounded-xl pl-10" {...register('email')} />
          </div>
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><LockIcon /></span>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="Enter your password"
              aria-label="Password"
              aria-invalid={!!errors.password}
              className="h-12 rounded-xl pl-10 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {mode === 'signin' && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-input accent-primary" />
              Remember me
            </label>
            <a href="/auth/reset" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">Forgot password?</a>
          </div>
        )}

        {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}
        {offerResend && resendState !== 'sent' && (
          <button type="button" onClick={resend} disabled={resendState === 'sending'}
            className="text-xs text-muted-foreground hover:underline">
            {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
        {notice && <p className="text-sm text-brand-green" role="status">{notice}</p>}

        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign In →' : 'Create account'}
        </Button>
      </form>

      <button onClick={magicLink} className="mt-3 w-full text-center text-xs text-muted-foreground hover:underline">
        Email me a magic link instead
      </button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === 'signin' ? (
          <>Don&apos;t have an account? <button type="button" onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">Create account</button></>
        ) : (
          <>Already have an account? <button type="button" onClick={() => setMode('signin')} className="font-semibold text-primary hover:underline">Sign in</button></>
        )}
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>🛡</span>
        Your data is secure with us. We never share your information.
      </div>
    </div>
  );
}
