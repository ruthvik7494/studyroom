'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinkClass = 'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#2d6c4f] hover:text-white';
const activeNavLinkClass = 'rounded-lg bg-[#2d6c4f] px-3 py-2 text-sm font-semibold text-white';

const panelLinkClass = 'block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-[#2d6c4f] hover:text-white';
const panelActiveLinkClass = 'block rounded-md bg-[#2d6c4f] px-3 py-2.5 text-sm font-semibold text-white';

interface NavItem { href: string; label: string }

/** A path is "active" if it matches exactly, or is a sub-page of it — except
 * "/", which would otherwise match every route. */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function buildItems(role: 'student' | 'owner' | 'admin' | null): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/centres', label: 'Study Centres' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact Us' },
  ];
  if (role) items.push({ href: '/saved', label: 'Saved' });
  if (role === 'owner') items.push({ href: '/owner/centres', label: 'My centres' });
  if (role === 'admin') items.push({ href: '/admin', label: 'Admin' });
  return items;
}

export function DesktopNav({ role }: { role: 'student' | 'owner' | 'admin' | null }) {
  const pathname = usePathname();
  const items = buildItems(role);
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? activeNavLinkClass : navLinkClass}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

interface MobileMenuProps {
  role: 'student' | 'owner' | 'admin' | null;
  email: string | null;
  signOutAction: () => void | Promise<void>;
}

/**
 * Hamburger menu for mobile and tablet (anything below the `md` breakpoint,
 * matching exactly where DesktopNav takes over) — a toggle button that opens
 * a dropdown panel with every nav link stacked vertically, plus the account
 * section (My Account / Sign out, or Sign In) that previously had nowhere to
 * live on these screen sizes at all.
 */
export function MobileMenu({ role, email, signOutAction }: MobileMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = buildItems(role);

  // Close automatically after navigating to a new page.
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-secondary"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
        )}
      </button>

      {open && (
        <nav id="mobile-nav-panel" aria-label="Primary mobile" className="absolute inset-x-0 top-full border-b bg-background px-4 py-3 shadow-md">
          <div className="space-y-0.5">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={cn(isActive(pathname, item.href) ? panelActiveLinkClass : panelLinkClass)}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 border-t pt-3">
            {email ? (
              <div className="flex items-center justify-between gap-3 px-1">
                {role !== 'owner' && role !== 'admin' && (
                  <Link href="/account" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {email.charAt(0).toUpperCase()}
                    </span>
                    My Account
                  </Link>
                )}
                <form action={signOutAction}>
                  <button className="rounded-full border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className={cn('flex items-center gap-1.5', isActive(pathname, '/login') ? panelActiveLinkClass : panelLinkClass)}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="12" cy="8" r="3.5" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
                </svg>
                Sign In
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
