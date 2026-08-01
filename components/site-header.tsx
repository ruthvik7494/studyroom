import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';

const navLinkClass = 'relative py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const activeNavLinkClass = 'relative py-2 text-sm font-semibold text-primary after:absolute after:-bottom-[1px] after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary';

/** App header. Server component: reads the session and shows the right links —
 * same role-based nav items as before (Saved for any signed-in user, My
 * centres for owners, Admin for admins), restyled with an underline on the
 * active link. */
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-[#fcfaf8]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
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

        {/* Primary nav — same items/conditions as before, restyled with an underline on the active link */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <Link href="/" className={activeNavLinkClass}>Home</Link>
          <Link href="/centres" className={navLinkClass}>Study Centres</Link>
          <Link href="/about" className={navLinkClass}>About Us</Link>
          <Link href="/contact" className={navLinkClass}>Contact Us</Link>
          {user && <Link href="/saved" className={navLinkClass}>Saved</Link>}
          {user?.role === 'owner' && <Link href="/owner/centres" className={navLinkClass}>My centres</Link>}
          {user?.role === 'admin' && <Link href="/admin" className={navLinkClass}>Admin</Link>}
        </nav>

        {/* Right side — account only */}
        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                  {(user.email ?? 'U').charAt(0).toUpperCase()}
                </span>
              </Link>
              <form action={signOut}>
                <button className="rounded-full border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="hidden items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="8" r="3.5" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
              </svg>
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav — same links, stacked, since the row above hides below md */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t px-4 py-2 md:hidden" aria-label="Primary mobile">
        <Link href="/" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-primary">Home</Link>
        <Link href="/centres" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Study Centres</Link>
        <Link href="/about" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">About Us</Link>
        <Link href="/contact" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Contact Us</Link>
        {user && <Link href="/saved" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Saved</Link>}
        {user?.role === 'owner' && <Link href="/owner/centres" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">My centres</Link>}
        {user?.role === 'admin' && <Link href="/admin" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Admin</Link>}
        {!user && <Link href="/login" className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Sign In</Link>}
      </nav>
    </header>
  );
}
