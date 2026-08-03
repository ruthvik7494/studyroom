'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Just the account-avatar icon that links to /account — hidden only on
 * /admin and /owner routes, where it's confusing next to their own
 * sidebar's account card and sign-out (which already covers the same
 * need). Shown as normal everywhere else, including for students. */
export function AccountAvatarLink({ initial }: { initial: string }) {
  const pathname = usePathname();
  const hide = pathname.startsWith('/admin') || pathname.startsWith('/owner');
  if (hide) return null;

  return (
    <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
        {initial}
      </span>
    </Link>
  );
}
