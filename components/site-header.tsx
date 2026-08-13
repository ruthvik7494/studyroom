import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';
import { DesktopNav, MobileMenu } from '@/components/nav-links';
import { AccountAvatarLink } from '@/components/account-avatar-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeaderShell } from '@/components/header-shell';

/** App header. Server component: reads the session and shows the right links —
 * same role-based nav items as before (Saved for any signed-in user, My
 * centres for owners, Admin for admins). Active-state highlighting and the
 * mobile hamburger menu are delegated to a small client nav component, since
 * both need client-only APIs (usePathname, useState). The scroll-linked
 * height shrink lives in <HeaderShell>, a thin client wrapper around this
 * otherwise server-rendered row. */
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#f7f9fb]/90 backdrop-blur-xl border-b border-[#e0e3e5] shadow-sm">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 h-16">
        {/* Brand Logo */}
        <Link href="/" className="text-2xl font-extrabold text-[#006b2c] font-['Lexend',sans-serif]">
          StudyNook
        </Link>

        {/* Navigation Links */}
        <DesktopNav role={user?.role ?? null} />

        {/* Auth Actions */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <AccountAvatarLink initial={(user.email ?? 'U').charAt(0).toUpperCase()} role={user.role} />
              <form action={signOut}>
                <button type="submit" className="text-sm font-semibold text-[#565e74] border border-[#e0e3e5] bg-white hover:bg-[#eceef0] px-4 py-1.5 rounded-full transition-colors">
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link className="text-sm font-semibold bg-[#006b2c] text-white px-5 py-2 rounded-xl hover:bg-[#00873a] transition-colors shadow-sm" href="/login">
              Sign In
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <MobileMenu role={user?.role ?? null} email={user?.email ?? null} signOutAction={signOut} />
        </div>
      </div>
    </header>
  );
}
