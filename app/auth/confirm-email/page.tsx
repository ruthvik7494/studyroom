import type { Metadata } from 'next';
import Link from 'next/link';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Confirm your email', ...noindex };

interface PageProps {
  searchParams: Promise<{ confirmation_url?: string }>;
}

/**
 * Why this page exists: Supabase's confirmation link is single-use. Many
 * email providers and corporate security scanners automatically "visit"
 * every link in an email to check it for malware BEFORE the real user
 * clicks anything — which silently consumes the one-time token, so the
 * real user then sees "invalid or already used" on their own first click.
 * Scanners fetch URLs but don't click buttons or run JavaScript actions —
 * so putting a real button in between (this page) means only a genuine
 * human click ever reaches Supabase's actual verification URL.
 * See: https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0
 */
export default async function ConfirmEmailPage({ searchParams }: PageProps) {
  const { confirmation_url } = await searchParams;

  if (!confirmation_url) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-bold">Link incomplete</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This confirmation link is missing some information. Please request a new one from the sign-in page.
        </p>
        <Link href="/login" className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          Go to sign in
        </Link>
      </main>
    );
  }

  // Only allow same-origin Supabase verification URLs — never redirect
  // through an arbitrary attacker-supplied address.
  let safeUrl: string | null = null;
  try {
    const parsed = new URL(confirmation_url);
    if (parsed.protocol === 'https:') safeUrl = parsed.toString();
  } catch {
    safeUrl = null;
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl" aria-hidden>📧</span>
      <h1 className="mt-4 font-display text-xl font-bold">Confirm your email address</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Click the button below to finish confirming your StudyNook account.
      </p>
      {safeUrl ? (
        <a
          href={safeUrl}
          className="mt-5 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          Confirm my email
        </a>
      ) : (
        <>
          <p className="mt-4 text-sm text-destructive">This link doesn&apos;t look right.</p>
          <Link href="/login" className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Go to sign in
          </Link>
        </>
      )}
    </main>
  );
}
