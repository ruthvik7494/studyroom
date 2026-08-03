'use client';
import { usePathname } from 'next/navigation';

const DASHBOARD_PREFIXES = ['/admin', '/owner', '/account'];

/**
 * The public SiteHeader/SiteFooter are rendered once, globally, in the root
 * layout — but /admin, /owner, and /account now each have their own sidebar
 * shell (DashboardShell) with equivalent navigation and account/sign-out
 * access. Without this, the public header's account-avatar link (which
 * always points to /account, the student dashboard) was showing on top of
 * the admin and owner dashboards too — confusing and simply wrong there.
 */
export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isDashboard) return null;
  return <>{children}</>;
}
