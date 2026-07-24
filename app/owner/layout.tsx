import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Owner', ...noindex };

const NAV = [
  { href: '/owner', label: 'Dashboard' },
  { href: '/owner/bookings', label: 'Bookings' },
  { href: '/owner/calendar', label: 'Calendar' },
  { href: '/owner/customers', label: 'Customers' },
  { href: '/owner/centres', label: 'My centres' },
  { href: '/owner/enquiries', label: 'Enquiries' },
] as const;

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requireRole('owner'); // server gate for the whole /owner section
  return (
    <div>
      <div className="border-b bg-secondary/30">
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-6" aria-label="Owner sections">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href as never} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
