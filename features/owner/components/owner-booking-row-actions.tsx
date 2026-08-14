'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateBookingStatus } from '@/features/admin/waitlist.actions';

const LONG_PERIODS = new Set(['day', 'week', 'fortnight', 'month', 'quarter', 'half_year', 'year']);

const NEXT: Record<string, { label: string; status: 'checked_in' | 'no_show' | 'completed' }[]> = {
  confirmed: [{ label: 'Check in', status: 'checked_in' }, { label: 'No-show', status: 'no_show' }],
  pending: [{ label: 'No-show', status: 'no_show' }],
  checked_in: [{ label: 'Complete', status: 'completed' }],
};

/** Owner-facing check-in / no-show / complete. Reuses updateBookingStatus
 * (which authorizes owner-of-centre server-side). */
export function OwnerBookingRowActions({ bookingId, status, period }: { bookingId: string; status: string; period?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const isLongTerm = period && LONG_PERIODS.has(period);

  if (isLongTerm && (status === 'confirmed' || status === 'checked_in')) {
    return <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Auto-Active Pass</span>;
  }

  const options = NEXT[status] ?? [];
  if (options.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  function set(next: 'checked_in' | 'no_show' | 'completed') {
    start(async () => {
      const res = await updateBookingStatus({ bookingId, status: next });
      if (res.ok) router.refresh();
    });
  }
  return (
    <span className="flex gap-1.5">
      {options.map((o) => (
        <button key={o.status} onClick={() => set(o.status)} disabled={pending}
          className="rounded border px-2 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50">{o.label}</button>
      ))}
    </span>
  );
}
