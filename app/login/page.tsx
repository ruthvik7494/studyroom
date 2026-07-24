import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/rbac';
import { AuthForm } from '@/features/auth/components/auth-form';
import { BrandPanel } from '@/components/brand-panel';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Sign in', ...noindex };

interface PageProps { searchParams: Promise<{ next?: string; error?: string }> }

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'That link is missing some information. Please request a new one.',
  expired: 'That link has expired.',
  invalid: 'That link is invalid or has already been used.',
};

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
      <BrandPanel className="hidden lg:block" />
    </main>
  );
}
