import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/rbac';
import { AuthForm } from '@/features/auth/components/auth-form';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Sign in', ...noindex };

interface PageProps { searchParams: Promise<{ next?: string; error?: string }> }

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'That link is missing some information. Please request a new one.',
  expired: 'That link has expired.',
  invalid: 'That link is invalid or has already been used.',
};

const FEATURES = [
  { icon: '🪑', label: 'Live seat availability' },
  { icon: '⭐', label: 'Verified reviews & ratings' },
  { icon: '⚡', label: 'Instant booking, pay online or at the centre' },
  { icon: '🛡', label: 'Women-safe verified spaces' },
];

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next ?? '/'); // already signed in

  return (
    <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Left — the form */}
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm
          next={next ?? '/'}
          initialError={error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.invalid) : undefined}
          offerResend={error === 'expired' || error === 'invalid'}
        />
      </div>

      {/* Right — brand panel (hidden on small screens) */}
      <div className="relative hidden overflow-hidden bg-[#0f1713] lg:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)',
          }}
        />
        <div aria-hidden className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-green/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-brand-gold/20 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12 text-[#F7F5F0]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 font-display font-bold">S</div>
            <span className="font-display text-sm font-bold uppercase tracking-wider">StudyNook</span>
          </div>

          <div>
            <h2 className="max-w-md font-display text-3xl font-bold leading-tight">
              Find your perfect study space in Warangal
            </h2>
            <p className="mt-3 max-w-sm text-sm text-[#F7F5F0]/70">
              Compare study halls, reading rooms and coworking desks — with real-time seats, verified reviews and transparent pricing.
            </p>

            <ul className="mt-8 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base" aria-hidden>{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[#F7F5F0]/40">© {new Date().getFullYear()} StudyNook · Warangal, Telangana</p>
        </div>
      </div>
    </main>
  );
}
