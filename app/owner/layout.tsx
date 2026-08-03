import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/rbac';
import { signOut } from '@/features/auth/actions';
import { noindex } from '@/lib/seo';
import { DashboardShell, type SidebarNavItem } from '@/components/dashboard-shell';

export const metadata: Metadata = { title: 'Owner', ...noindex };

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d={d} strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const NAV: SidebarNavItem[] = [
  { href: '/owner', label: 'Dashboard', icon: icon('M4 12 12 4l8 8M6 10v10h12V10') },
  { href: '/owner/centres/new', label: 'Create Centre', icon: icon('M12 4v16m-8-8h16') },
  { href: '/owner/bookings', label: 'Bookings', icon: icon('M8 3v3m8-3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z') },
  { href: '/owner/refunds', label: 'Refunds', icon: icon('M3 10h18M7 15h.01M11 15h4M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z') },
  { href: '/owner/calendar', label: 'Calendar', icon: icon('M8 3v3m8-3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z') },
  { href: '/owner/customers', label: 'Customers', icon: icon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 4a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4') },
  { href: '/owner/centres', label: 'My Centres', icon: icon('M4 6h16M4 12h16M4 18h10') },
  { href: '/owner/enquiries', label: 'Enquiries', icon: icon('M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z') },
  { href: '/owner/settings', label: 'Settings', icon: icon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.15-1.5l2-1.5-2-3.5-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2h-4l-.35 2.9a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.5 2 1.5A7.4 7.4 0 0 0 4.6 12a7.4 7.4 0 0 0 .15 1.5l-2 1.5 2 3.5 2.3-.9a7.5 7.5 0 0 0 2.6 1.5L10 22h4l.35-2.9a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.5-2-1.5c.1-.5.15-1 .15-1.5Z') },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('owner'); // server gate for the whole /owner section, unchanged
  return (
    <DashboardShell
      brandLabel="Owner Panel"
      navItems={NAV}
      user={{ name: user.email?.split('@')[0] ?? 'Owner', roleLabel: 'Centre Owner', initial: (user.email ?? 'O').charAt(0).toUpperCase() }}
      signOutAction={signOut}
    >
      {children}
    </DashboardShell>
  );
}
