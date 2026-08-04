'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarUser {
  name: string;
  roleLabel: string;
  initial: string;
}

/**
 * Picks the single most-specific nav item that matches the current path.
 * Plain per-item prefix matching (pathname.startsWith(href + '/')) breaks
 * when one item's href is itself a prefix of another's — e.g. "My Centres"
 * (/owner/centres) and "Create Centre" (/owner/centres/new): visiting
 * /owner/centres/new would match BOTH, highlighting them simultaneously.
 * Matching against the whole nav list at once and keeping only the longest
 * href match fixes that — the more specific route always wins.
 */
function bestMatchHref(pathname: string, navItems: SidebarNavItem[]): string | null {
  let best: string | null = null;
  for (const item of navItems) {
    const exact = item.href === '/admin' || item.href === '/owner' || item.href === '/account';
    const matches = pathname === item.href || (!exact && pathname.startsWith(`${item.href}/`));
    if (matches && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

/**
 * Sidebar dashboard shell — logo, nav list, user card pinned at the bottom.
 * On screens below `lg`, the sidebar becomes an off-canvas drawer opened by
 * a hamburger button in a small top bar, instead of disappearing entirely.
 */
export function DashboardShell({
  brandLabel, navItems, user, signOutAction, children,
}: {
  brandLabel: string;
  navItems: SidebarNavItem[];
  user: SidebarUser;
  signOutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  const activeHref = bestMatchHref(pathname, navItems);

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-base font-bold text-primary-foreground">S</span>
        <div>
          <p className="font-display text-base font-extrabold leading-tight">StudyNook</p>
          <p className="text-xs leading-tight text-muted-foreground">{brandLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Dashboard">
        {navItems.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href as never}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <span className="shrink-0" aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 p-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{user.initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <button type="submit" aria-label="Sign out" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9M10 12h11m0 0-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-secondary/20 lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card print:hidden lg:flex">
        {nav}
      </aside>

      {/* Mobile/tablet top bar + off-canvas drawer */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3 print:hidden lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">S</span>
          <p className="font-display text-sm font-extrabold">StudyNook <span className="font-normal text-muted-foreground">· {brandLabel}</span></p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-secondary"
        >
          {open ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
          )}
        </button>
      </div>
      {open && (
        <>
          <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-72 max-w-[80vw] flex-col border-r bg-card shadow-xl lg:hidden">
            {nav}
          </aside>
        </>
      )}

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
