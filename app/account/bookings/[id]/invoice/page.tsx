import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { formatINR } from '@/lib/utils';
import { getInvoiceData } from '@/features/bookings/services/invoice.service';
import { PrintButton } from '@/features/bookings/components/print-button';

export const metadata: Metadata = { title: 'Invoice', ...noindex };

/**
 * Printable invoice / receipt for a paid booking.
 * Security: requireUser() + the invoice is only shown to the booking's owner
 * (or an admin) — enforced by RLS on the underlying booking select. Renders as
 * clean HTML the user can print to PDF via their browser (Ctrl/Cmd+P).
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const db = await createClient();

  // RLS ensures the user can only read their own booking (admins: all).
  const invoice = await getInvoiceData(db, id, user.email ?? null);
  if (!invoice) notFound(); // not found, not paid, or not visible to this user

  const dateFmt = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:py-0">
      {/* Print button — hidden when printing */}
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-border bg-card p-8 print:border-0 print:p-0">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">S</span>
              <span className="font-display text-lg font-extrabold">StudyNook</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">India</p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-xl font-extrabold">INVOICE</h1>
            <p className="mt-1 font-mono text-sm">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">{dateFmt(invoice.invoicedAt)}</p>
          </div>
        </header>

        {/* Parties */}
        <section className="grid grid-cols-1 gap-6 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billed to</p>
            <p className="font-medium">{invoice.customer.name ?? 'Customer'}</p>
            {invoice.customer.email && <p className="text-muted-foreground">{invoice.customer.email}</p>}
          </div>
          <div className="sm:text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Study space</p>
            <p className="font-medium">{invoice.centre.name}</p>
            {invoice.centre.address && <p className="text-muted-foreground">{invoice.centre.address}</p>}
            {!invoice.centre.address && invoice.centre.area && <p className="text-muted-foreground">{invoice.centre.area}</p>}
          </div>
        </section>

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 font-semibold">Description</th>
              <th scope="col" className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3">
                <p className="font-medium">
                  {invoice.resource?.label ?? 'Seat booking'} · {invoice.period}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFmt(invoice.startsAt)}
                  {invoice.period !== 'day' && ` – ${dateFmt(invoice.endsAt)}`}
                </p>
              </td>
              <td className="py-3 text-right font-mono">{formatINR(invoice.base)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals with GST breakdown */}
        <section className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <Row label="Subtotal" value={formatINR(invoice.base)} />
          <Row label={`CGST (${((invoice.taxRate / 2) * 100).toFixed(0)}%)`} value={formatINR(invoice.cgst)} muted />
          <Row label={`SGST (${((invoice.taxRate / 2) * 100).toFixed(0)}%)`} value={formatINR(invoice.sgst)} muted />
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total paid</span>
            <span className="font-mono">{formatINR(invoice.amount)}</span>
          </div>
        </section>

        {/* Payment reference */}
        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>Status: <span className="font-medium text-foreground">Paid</span></span>
            {invoice.paymentId && <span>Payment ID: <span className="font-mono">{invoice.paymentId}</span></span>}
            {invoice.orderId && <span>Order ID: <span className="font-mono">{invoice.orderId}</span></span>}
          </div>
          <p className="mt-3">
            This is a computer-generated receipt for a study-space booking made through StudyNook.
            Amounts shown are inclusive of GST. Thank you.
          </p>
        </footer>
      </article>
    </main>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
