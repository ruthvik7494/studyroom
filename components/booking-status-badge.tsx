import { Badge } from '@/components/ui/badge';

const MAP: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'safe' | 'destructive'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  checked_in: { variant: 'safe', label: 'Checked in' },
  completed: { variant: 'secondary', label: 'Completed' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  no_show: { variant: 'destructive', label: 'No show' },
  expired: { variant: 'secondary', label: 'Expired' },
  refunded: { variant: 'secondary', label: 'Refunded' },
};
const PAY: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; label: string }> = {
  unpaid: { variant: 'warning', label: 'Unpaid' },
  paid: { variant: 'success', label: 'Paid' },
  failed: { variant: 'destructive', label: 'Failed' },
  refunded: { variant: 'secondary', label: 'Refunded' },
  partially_refunded: { variant: 'secondary', label: 'Part. refunded' },
  refund_pending: { variant: 'warning', label: 'Refund pending' },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { variant: 'secondary' as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: string }) {
  const s = PAY[status] ?? { variant: 'secondary' as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
