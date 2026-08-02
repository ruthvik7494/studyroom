'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinkClass = 'relative py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const activeNavLinkClass = 'relative py-2 text-sm font-semibold text-primary after:absolute after:-bottom-[1px] after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary';

const mobileLinkClass = 'shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground';
const mobileActiveLinkClass = 'shrink-0 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary';

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
    <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? activeNavLinkClass : navLinkClass}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({ role, showSignIn }: { role: 'student' | 'owner' | 'admin' | null; showSignIn: boolean }) {
  const pathname = usePathname();
  const items = buildItems(role);
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-t px-4 py-2 md:hidden" aria-label="Primary mobile">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={cn(isActive(pathname, item.href) ? mobileActiveLinkClass : mobileLinkClass)}>
          {item.label}
        </Link>
      ))}
      {showSignIn && <Link href="/login" className={isActive(pathname, '/login') ? mobileActiveLinkClass : mobileLinkClass}>Sign In</Link>}
    </nav>
  );
}
