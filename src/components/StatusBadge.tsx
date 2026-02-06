import { RacquetStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RacquetStatus;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // New club statuses
  received: {
    label: 'Received by Front Desk',
    className: 'bg-status-pending-bg text-status-pending',
  },
  'ready-for-stringing': {
    label: 'Ready for Stringing',
    className: 'bg-status-progress-bg text-status-progress',
  },
  'received-by-stringer': {
    label: 'Received by Stringer',
    className: 'bg-status-progress-bg text-status-progress',
  },
  complete: {
    label: 'Ready for Pickup',
    className: 'bg-status-complete-bg text-status-complete',
  },
  'waiting-pickup': {
    label: 'Waiting Pickup',
    className: 'bg-amber-500/20 text-amber-400',
  },
  delivered: {
    label: 'Pickup Completed',
    className: 'bg-green-100/10 text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-status-cancelled-bg text-status-cancelled',
  },
  // Legacy mappings
  processing: {
    label: 'Received by Front Desk',
    className: 'bg-status-pending-bg text-status-pending',
  },
  'in-progress': {
    label: 'Received by Stringer',
    className: 'bg-status-progress-bg text-status-progress',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.received;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
