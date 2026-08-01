import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';

const navLinkClass = 'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground';

/** App header. Server component: reads the session and shows the right links. */
export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-[#fcfaf8]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">S</span>
          <span className="font-display text-lg font-extrabold">
            Study<span className="text-brand-gold">Nook</span>
          </span>
        </Link>

        {/* Primary nav — same items as before, plus About Us / Contact Us in every state */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link href="/centres" className={navLinkClass}>Browse</Link>
          <Link href="/about" className={navLinkClass}>About Us</Link>
          <Link href="/contact" className={navLinkClass}>Contact Us</Link>
          {user && <Link href="/saved" className={navLinkClass}>Saved</Link>}
          {user?.role === 'owner' && <Link href="/owner/centres" className={navLinkClass}>My centres</Link>}
          {user?.role === 'admin' && <Link href="/admin" className={navLinkClass}>Admin</Link>}
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                aria-label="Account"
                title="Account"
              >
                {(user.email ?? 'U').charAt(0).toUpperCase()}
              </Link>
              <form action={signOut}>
                <button className="rounded-full border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav — same links, stacked, since the row above hides below md */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t px-4 py-2 md:hidden" aria-label="Primary mobile">
        <Link href="/centres" className={navLinkClass}>Browse</Link>
        <Link href="/about" className={navLinkClass}>About Us</Link>
        <Link href="/contact" className={navLinkClass}>Contact Us</Link>
        {user && <Link href="/saved" className={navLinkClass}>Saved</Link>}
        {user?.role === 'owner' && <Link href="/owner/centres" className={navLinkClass}>My centres</Link>}
        {user?.role === 'admin' && <Link href="/admin" className={navLinkClass}>Admin</Link>}
      </nav>
    </header>
  );
}
