import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { normalizeStatusKey } from '@/types';

interface PickupCountdownBadgeProps {
  readyForPickupAt: string | null;
  status: string | null;
}

const PICKUP_STATUSES = new Set([
  'ready_for_pickup',
  'complete',
  'waiting-pickup',
  'waiting_pickup',
  'stringing_completed',
]);

export function PickupCountdownBadge({ readyForPickupAt, status }: PickupCountdownBadgeProps) {
  const normalized = normalizeStatusKey(status);
  if (!readyForPickupAt || !PICKUP_STATUSES.has(normalized)) return null;

  const days = differenceInCalendarDays(new Date(), parseISO(readyForPickupAt));
  const isOverdue = days >= 10;
  const isWarning = days >= 8 && days < 10;

  let label: string;
  if (days < 0) {
    label = 'Ready';
  } else if (days === 0) {
    label = 'Ready today';
  } else if (days < 8) {
    label = `Day ${days}`;
  } else if (isOverdue) {
    label = `OVERDUE (Day ${days})`;
  } else {
    label = `${10 - days} days left`;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        isOverdue && 'bg-destructive/20 text-destructive',
        isWarning && 'bg-status-pending-bg text-status-pending',
        !isOverdue && !isWarning && days <= 7 && 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
