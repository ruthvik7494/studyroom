import Link from 'next/link';
import { signOut } from '@/features/auth/actions';

interface AccountBlockedScreenProps {
  status: 'suspended' | 'deleted';
}

const COPY: Record<AccountBlockedScreenProps['status'], { icon: string; title: string; body: string }> = {
  deleted: {
    icon: '🗑️',
    title: 'This account has been deleted',
    body: 'This account was deleted at your request and no longer has access to StudyNook. If this was a mistake or you have questions, please contact us.',
  },
  suspended: {
    icon: '⛔',
    title: 'This account is suspended',
    body: 'This account has been suspended. If you think this is a mistake, please contact us and we\u2019ll look into it.',
  },
};

/**
 * Shown by /account, /owner and /admin layouts in place of the dashboard
 * when the signed-in account's status isn't 'active' — instead of letting
 * a deeper requireUser()/requireRole() call throw and fall through to a
 * generic "Something went wrong" error boundary with no explanation.
 * A deleted/suspended account's login isn't removed (see
 * 0049_account_deletion_requests.sql for why), so they can still sign in —
 * this is what they see once they do, with a clear way out.
 */
export function AccountBlockedScreen({ status }: AccountBlockedScreenProps) {
  const copy = COPY[status];
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center" role="alert">
      <span className="text-4xl" aria-hidden>{copy.icon}</span>
      <h1 className="mt-4 font-display text-xl font-bold">{copy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/contact" className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-secondary">
          Contact us
        </Link>
        <form action={signOut}>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
