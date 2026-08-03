import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';
import { noindex } from '@/lib/seo';
import { DashboardShell, type SidebarNavItem } from '@/components/dashboard-shell';

export const metadata: Metadata = { title: 'My Account', ...noindex };

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d={d} strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const NAV: SidebarNavItem[] = [
  { href: '/account', label: 'Dashboard', icon: icon('M4 12 12 4l8 8M6 10v10h12V10') },
  { href: '/account/profile', label: 'My Profile', icon: icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z') },
  { href: '/account/notifications', label: 'Notifications', icon: icon('M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9') },
  { href: '/centres', label: 'Find a Study Space', icon: icon('M4 6h16M4 12h16M4 18h10') },
];

/**
 * Student account shell — same sidebar pattern as /admin and /owner. Route
 * protection enforced here server-side, same as those two layouts.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account');

  return (
    <DashboardShell
      brandLabel="Student Panel"
      navItems={NAV}
      user={{ name: user.email?.split('@')[0] ?? 'Student', roleLabel: 'Student', initial: (user.email ?? 'S').charAt(0).toUpperCase() }}
      signOutAction={signOut}
    >
      {children}
    </DashboardShell>
  );
}
