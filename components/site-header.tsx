import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/features/auth/actions';

const navLinkClass = 'relative py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const activeNavLinkClass = 'relative py-2 text-sm font-semibold text-primary after:absolute after:-bottom-[1px] after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary';

/** App header. Server component: reads the session and shows the right links —
 * same role-based nav items as before (Saved for any signed-in user, My
 * centres for owners, Admin for admins), just restyled to match the new
 * reference layout (underlined active link, location badge, heart-icon
 * wishlist count, and a "List Your Centre" CTA). */
export async function SiteHeader() {
  const user = await getSessionUser();

  let savedCount = 0;
  if (user) {
    const db = await createClient();
    const { count } = await db.from('saved_listings').select('centre_id', { count: 'exact', head: true }).eq('user_id', user.id);
    savedCount = count ?? 0;
  }

  // Where "List Your Centre" should send each role — owners/admins go
  // straight to their own create-listing flow; everyone else signs in first
  // (creating a listing requires an owner account).
  const listCentreHref =
    user?.role === 'owner' ? '/owner/centres/new'
    : user?.role === 'admin' ? '/admin/centres/new'
    : '/login?next=/owner/centres/new';

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

        {/* Right side — location badge, wishlist, account, CTA */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground lg:inline-flex">
            <span aria-hidden>📍</span> Warangal
          </span>

          {user && (
            <Link href="/saved" aria-label={`Saved centres${savedCount ? ` (${savedCount})` : ''}`} className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 20.5s-7.5-4.6-9.5-9.3C1.2 8 2.6 4.8 5.7 4C8 3.4 10.3 4.4 12 6.5c1.7-2.1 4-3.1 6.3-2.5c3.1.8 4.5 4 3.2 7.2C19.5 15.9 12 20.5 12 20.5Z" />
              </svg>
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {savedCount > 9 ? '9+' : savedCount}
                </span>
              )}
            </Link>
          )}

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

          <Link href={listCentreHref} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            List Your Centre
          </Link>
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
