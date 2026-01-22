import { cn } from '@/lib/utils';

interface DueStatusBadgeProps {
  pickupDeadline: string | null;
  status: string | null;
}

type DueLevel = 'overdue' | 'today' | 'urgent' | 'warning' | 'soon' | 'ok' | 'none';

interface DueConfig {
  label: string;
  className: string;
}

const dueConfig: Record<DueLevel, DueConfig> = {
  overdue: {
    label: 'OVERDUE',
    className: 'bg-destructive/20 text-destructive',
  },
  today: {
    label: 'DUE TODAY',
    className: 'bg-status-pending-bg text-status-pending',
  },
  urgent: {
    label: 'DUE IN 1 DAY',
    className: 'bg-orange-500/20 text-orange-400',
  },
  warning: {
    label: 'DUE IN 2 DAYS',
    className: 'bg-amber-500/20 text-amber-400',
  },
  soon: {
    label: '', // Will be set dynamically
    className: 'bg-status-progress-bg text-status-progress',
  },
  ok: {
    label: '', // Will be set dynamically
    className: 'bg-status-complete-bg text-status-complete',
  },
  none: {
    label: '',
    className: '',
  },
};

export function DueStatusBadge({ pickupDeadline, status }: DueStatusBadgeProps) {
  // Don't show due status for delivered items
  if (status === 'delivered' || !pickupDeadline) {
    return null;
  }

  // Calculate days difference
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = pickupDeadline.split('-').map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let level: DueLevel;
  let customLabel = '';

  if (daysDiff < 0) {
    level = 'overdue';
  } else if (daysDiff === 0) {
    level = 'today';
  } else if (daysDiff === 1) {
    level = 'urgent';
  } else if (daysDiff === 2) {
    level = 'warning';
  } else if (daysDiff <= 7) {
    level = 'soon';
    customLabel = `DUE IN ${daysDiff} DAYS`;
  } else {
    level = 'ok';
    customLabel = `DUE IN ${daysDiff} DAYS`;
  }

  const config = dueConfig[level];
  const label = customLabel || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide',
        config.className
      )}
    >
      {label}
    </span>
  );
}
