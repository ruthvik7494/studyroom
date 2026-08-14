import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';
import { noindex } from '@/lib/seo';
import { DashboardShell, type SidebarNavItem } from '@/components/dashboard-shell';
import { AccountBlockedScreen } from '@/components/account-blocked-screen';

export const metadata: Metadata = { title: 'Admin', ...noindex };
export const dynamic = 'force-dynamic';

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d={d} strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const NAV: SidebarNavItem[] = [
  { href: '/admin', label: 'Overview', icon: icon('M4 12 12 4l8 8M6 10v10h12V10') },
  { href: '/admin/centres/all', label: 'All Centres', icon: icon('M4 6h16M4 12h16M4 18h10') },
  { href: '/admin/users', label: 'Users', icon: icon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 4a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4') },
  { href: '/admin/bookings', label: 'Bookings', icon: icon('M8 3v3m8-3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z') },
  { href: '/admin/waitlist', label: 'Waitlist', icon: icon('M9 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-6 14c0-3.3 2.7-6 6-6h.5M15 20h6m-3-3v6') },
  { href: '/admin/reviews', label: 'Moderation', icon: icon('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z') },
  { href: '/admin/claims', label: 'Claims', icon: icon('M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z') },
  { href: '/admin/account-deletions', label: 'Account Deletions', icon: icon('M19 7 18.13 19.14A2 2 0 0 1 16.13 21H7.87a2 2 0 0 1-2-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M4 7h16') },
  { href: '/admin/enquiries', label: 'Enquiries', icon: icon('M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z') },
  { href: '/admin/audit', label: 'Audit Log', icon: icon('M9 12h6m-6 4h6m-9 4h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8L4 8v10a2 2 0 0 0 2 2Z') },
  { href: '/admin/email-logs', label: 'Email Logs', icon: icon('M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z') },
  { href: '/admin/settings', label: 'Settings', icon: icon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.15-1.5l2-1.5-2-3.5-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2h-4l-.35 2.9a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.5 2 1.5A7.4 7.4 0 0 0 4.6 12a7.4 7.4 0 0 0 .15 1.5l-2 1.5 2 3.5 2.3-.9a7.5 7.5 0 0 0 2.6 1.5L10 22h4l.35-2.9a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.5-2-1.5c.1-.5.15-1 .15-1.5Z') },
];

/**
 * Admin shell. Route protection is enforced here server-side (not just in
 * middleware) — the charter requires real authorization, not hidden nav.
 * Same guard as before, only the presentation (sidebar instead of a top
 * pill-nav row) has changed.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.accountStatus !== 'active') return <AccountBlockedScreen status={user.accountStatus} />;
  if (user.role !== 'admin') redirect('/');

  return (
    <DashboardShell
      brandLabel="Admin Panel"
      navItems={NAV}
      user={{ name: user.email?.split('@')[0] ?? 'Admin', roleLabel: 'Super Admin', initial: (user.email ?? 'A').charAt(0).toUpperCase() }}
      signOutAction={signOut}
    >
      {children}
    </DashboardShell>
  );
}
