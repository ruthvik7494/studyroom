import Link from 'next/link';

/** Just the account-avatar icon that links to /account (the student
 * dashboard) — hidden for owner/admin accounts everywhere, on every page,
 * since they have their own role-specific dashboards and /account isn't
 * really "their" account home. This is a role check, not a route check —
 * it must stay hidden even after navigating away from /admin or /owner to
 * some other page like the homepage. */
export function AccountAvatarLink({ initial, role }: { initial: string; role: 'student' | 'owner' | 'admin' }) {
  const targetHref = role === 'admin' ? '/admin' : role === 'owner' ? '/owner' : '/account';

  return (
    <Link href={targetHref} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#006b2c]/10 text-xs font-bold text-[#006b2c] hover:bg-[#006b2c]/20 transition-colors">
        {initial}
      </span>
    </Link>
  );
}
