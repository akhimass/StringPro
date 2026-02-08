import { cn } from '@/lib/utils';

type PaymentStatus = 'unpaid' | 'partial' | 'paid';

interface PaymentStatusBadgeProps {
  /** Prefer passing payment_status from job; paid is legacy for backward compat */
  paymentStatus?: PaymentStatus;
  paid?: boolean;
}

export function PaymentStatusBadge({ paymentStatus, paid }: PaymentStatusBadgeProps) {
  const status: PaymentStatus =
    paymentStatus ?? (paid ? 'paid' : 'unpaid');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        status === 'paid' && 'bg-status-complete-bg text-status-complete',
        status === 'partial' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        status === 'unpaid' && 'bg-status-pending-bg text-status-pending'
      )}
    >
      {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'}
    </span>
  );
}
