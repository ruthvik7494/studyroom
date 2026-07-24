import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Admin', ...noindex };

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/centres/new', label: '+ Create Centre', primary: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/centres', label: 'Approvals' },
  { href: '/admin/waitlist', label: 'Waitlist' },
  { href: '/admin/reviews', label: 'Moderation' },
  { href: '/admin/claims', label: 'Claims' },
  { href: '/admin/audit', label: 'Audit log' },
] as const;

/**
 * Admin shell. Route protection is enforced here server-side (not just in
 * middleware) — the charter requires real authorization, not hidden nav.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/');

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-wider text-brand-gold">StudyNook Admin</p>
          <h1 className="font-display text-xl font-bold">Operations</h1>
        </div>
      </header>
      <nav className="mb-6 flex flex-wrap gap-1" aria-label="Admin sections">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href as never}
            className={
              'primary' in n && n.primary
                ? 'rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90'
                : 'rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground'
            }
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
