import { RacquetStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RacquetStatus;
}

const statusConfig: Record<RacquetStatus, { label: string; className: string }> = {
  processing: {
    label: 'Processing',
    className: 'bg-status-pending-bg text-status-pending',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-status-progress-bg text-status-progress',
  },
  complete: {
    label: 'Complete',
    className: 'bg-status-complete-bg text-status-complete',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-status-cancelled-bg text-status-cancelled',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
