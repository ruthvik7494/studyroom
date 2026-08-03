import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';
import { DesktopNav, MobileMenu } from '@/components/nav-links';
import { AccountAvatarLink } from '@/components/account-avatar-link';

/** App header. Server component: reads the session and shows the right links —
 * same role-based nav items as before (Saved for any signed-in user, My
 * centres for owners, Admin for admins). Active-state highlighting and the
 * mobile hamburger menu are delegated to a small client nav component, since
 * both need client-only APIs (usePathname, useState). */
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-[#fcfaf8]/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">S</span>
          <span>
            <span className="block font-display text-lg font-extrabold leading-tight">
              Study<span className="text-brand-gold">Nook</span>
            </span>
            <span className="hidden text-[11px] leading-none text-muted-foreground sm:block">Find. Book. Study.</span>
          </span>
        </Link>

        <DesktopNav role={user?.role ?? null} />

        {/* Right side — account (desktop/tablet-wide only; mobile/tablet
            gets the same account actions folded into the hamburger panel,
            matching DesktopNav's md breakpoint exactly so there's no gap
            where neither is shown) */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {user ? (
            <>
              <AccountAvatarLink initial={(user.email ?? 'U').charAt(0).toUpperCase()} />
              <form action={signOut}>
                <button className="rounded-full border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="8" r="3.5" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
              </svg>
              Sign In
            </Link>
          )}
        </div>

        <MobileMenu role={user?.role ?? null} email={user?.email ?? null} signOutAction={signOut} />
      </div>
    </header>
  );
}
