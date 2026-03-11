import { cn } from '@/lib/utils';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { normalizeStatusKey } from '@/types';

/** Number of days from "ready for pickup" by which customer should pick up (used for timer). */
const PICKUP_DEADLINE_DAYS = 10;

interface PickupCountdownBadgeProps {
  readyForPickupAt: string | null;
  status: string | null;
}

const PICKUP_READY_STATUSES = new Set([
  'ready_for_pickup',
  'complete',
  'waiting-pickup',
  'waiting_pickup',
  'stringing_completed',
]);

export function PickupCountdownBadge({ readyForPickupAt, status }: PickupCountdownBadgeProps) {
  const normalized = normalizeStatusKey(status);
  const isReadyForPickup = PICKUP_READY_STATUSES.has(normalized);

  // Not yet ready for pickup: show "Not ready yet"
  if (!isReadyForPickup) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap bg-muted text-muted-foreground">
        Not ready yet
      </span>
    );
  }

  // Ready but no timestamp (legacy): show generic message
  if (!readyForPickupAt) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap bg-muted text-muted-foreground">
        Ready — check status
      </span>
    );
  }

  const daysSinceReady = differenceInCalendarDays(new Date(), parseISO(readyForPickupAt));
  const daysLeftToPickup = PICKUP_DEADLINE_DAYS - daysSinceReady;
  const isOverdue = daysLeftToPickup < 0;
  const isDueToday = daysLeftToPickup === 0;
  const isWarning = daysLeftToPickup > 0 && daysLeftToPickup <= 2;

  let label: string;
  if (isOverdue) {
    label = `${Math.abs(daysLeftToPickup)} day${Math.abs(daysLeftToPickup) !== 1 ? 's' : ''} overdue`;
  } else if (isDueToday) {
    label = 'Due today';
  } else {
    label = `${daysLeftToPickup} day${daysLeftToPickup !== 1 ? 's' : ''} left to pickup`;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
        isOverdue && 'bg-destructive/20 text-destructive',
        isWarning && 'bg-status-pending-bg text-status-pending',
        !isOverdue && !isWarning && 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
