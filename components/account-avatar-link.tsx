import Link from 'next/link';

/** Just the account-avatar icon that links to /account (the student
 * dashboard) — hidden for owner/admin accounts everywhere, on every page,
 * since they have their own role-specific dashboards and /account isn't
 * really "their" account home. This is a role check, not a route check —
 * it must stay hidden even after navigating away from /admin or /owner to
 * some other page like the homepage. */
export function AccountAvatarLink({ initial, role }: { initial: string; role: 'student' | 'owner' | 'admin' }) {
  if (role === 'owner' || role === 'admin') return null;

  return (
    <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
        {initial}
      </span>
    </Link>
  );
}
