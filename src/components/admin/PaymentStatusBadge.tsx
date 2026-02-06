import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  paid: boolean;
}

export function PaymentStatusBadge({ paid }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        paid
          ? 'bg-status-complete-bg text-status-complete'
          : 'bg-status-pending-bg text-status-pending'
      )}
    >
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  );
}
