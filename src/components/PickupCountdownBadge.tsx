import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';

interface PickupCountdownBadgeProps {
  readyForPickupAt: string | null;
  status: string | null;
}

export function PickupCountdownBadge({ readyForPickupAt, status }: PickupCountdownBadgeProps) {
  // Only show for jobs that are ready for pickup / waiting
  const pickupStatuses = ['ready_for_pickup', 'complete', 'waiting-pickup', 'waiting_pickup', 'stringing_completed'];
  if (!readyForPickupAt || !pickupStatuses.includes(status ?? '')) return null;

  const days = differenceInCalendarDays(new Date(), parseISO(readyForPickupAt));

  if (days < 8) return null;

  const isOverdue = days >= 10;
  const isWarning = days >= 8 && days < 10;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        isOverdue && 'bg-destructive/20 text-destructive',
        isWarning && 'bg-status-pending-bg text-status-pending',
      )}
    >
      {isOverdue ? `OVERDUE (Day ${days})` : `${10 - days} days left`}
    </span>
  );
}
