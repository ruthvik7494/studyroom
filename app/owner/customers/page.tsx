import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import { getOwnerCustomers } from '@/features/owner/services/bookings.service';

export const metadata: Metadata = { title: 'Customers', ...noindex };

export default async function OwnerCustomersPage() {
  const user = await requireRole('owner');
  const db = await createClient();
  const customers = await getOwnerCustomers(db, user.id);

  const totalSpend = customers.reduce((s, c) => s + c.totalSpend, 0);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-xl font-bold">Customers</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone who has booked across your centres, by lifetime spend.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Customers</p><p className="font-display text-xl font-bold">{customers.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total revenue</p><p className="font-display text-xl font-bold">{formatINR(totalSpend)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Repeat customers</p><p className="font-display text-xl font-bold">{customers.filter((c) => c.bookings > 1).length}</p></Card>
      </div>

      <Card className="mt-6 overflow-x-auto">
        {customers.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Bookings</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total spend</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Last visit</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.userId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name ?? 'Customer'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.bookings}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(c.totalSpend)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
