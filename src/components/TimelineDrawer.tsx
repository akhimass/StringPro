import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RacquetJob, StatusEvent } from '@/types';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface TimelineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racquet: RacquetJob | null;
}

interface TimelineEvent {
  label: string;
  date: string | null;
  staffName?: string | null;
  completed: boolean;
  current: boolean;
}

const CANONICAL_STEPS = [
  { key: 'received_front_desk', label: 'Received by Front Desk' },
  { key: 'ready_for_stringing', label: 'Ready for Stringing' },
  { key: 'received_by_stringer', label: 'Received by Stringer' },
  { key: 'completed', label: 'Completed / Ready for Pickup' },
  { key: 'waiting_pickup', label: 'Waiting Pickup' },
  { key: 'pickup_completed', label: 'Pickup Completed' },
] as const;

const EXTRA_EVENTS = [
  { key: 'mark_paid', label: 'Payment Marked Paid' },
] as const;

function formatDate(d: string | null): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), 'MMM d, yyyy h:mm a');
  } catch {
    return d;
  }
}

function getTimelineEventsFromStatusEvents(racquet: RacquetJob): TimelineEvent[] | null {
  const events = racquet.status_events;
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort((a: StatusEvent, b: StatusEvent) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });

  // Map earliest occurrence for each event_type (or latest if desired)
  const byType = new Map<string, StatusEvent>();
  for (const ev of sorted) byType.set(ev.event_type, ev);

  // Canonical steps first
  const stepEvents: TimelineEvent[] = CANONICAL_STEPS.map((s) => {
    // accept both snake_case and kebab variants
    const ev =
      byType.get(s.key) ||
      byType.get(s.key.replace(/_/g, '-')) ||
      null;

    return {
      label: s.label,
      date: ev ? formatDate(ev.created_at) : null,
      staffName: ev?.staff_name ?? null,
      completed: !!ev,
      current: false,
    };
  });

  // Determine current = first incomplete step (or last if all complete)
  const firstIncompleteIdx = stepEvents.findIndex((e) => !e.completed);
  const currentIdx = firstIncompleteIdx === -1 ? stepEvents.length - 1 : firstIncompleteIdx;
  stepEvents[currentIdx].current = true;

  // Optional: show payment marker as an extra row (not a process step)
  const extra: TimelineEvent[] = EXTRA_EVENTS.map((s) => {
    const ev = byType.get(s.key);
    return {
      label: s.label,
      date: ev ? formatDate(ev.created_at) : null,
      staffName: ev?.staff_name ?? null,
      completed: !!ev,
      current: false,
    };
  }).filter((e) => e.completed);

  return [...stepEvents, ...extra];
}

function getSyntheticTimelineEvents(racquet: RacquetJob): TimelineEvent[] {
  // legacy synthetic behavior (unchanged structure)
  const statusOrder = [
    'received',
    'ready-for-stringing',
    'received-by-stringer',
    'complete',
    'waiting-pickup',
    'delivered',
  ] as const;

  const resolveStatus = (status: string | null): string => {
    if (status === 'processing') return 'received';
    if (status === 'in-progress') return 'received-by-stringer';
    return status || 'received';
  };

  const resolved = resolveStatus(racquet.status);
  const currentIdx = statusOrder.indexOf(resolved as any);

  return [
    {
      label: 'Received by Front Desk',
      date: formatDate(racquet.drop_in_date),
      completed: currentIdx >= 0,
      current: currentIdx === 0,
    },
    {
      label: 'Ready for Stringing',
      date: currentIdx >= 1 ? formatDate(racquet.updated_at) : null,
      completed: currentIdx >= 1,
      current: currentIdx === 1,
    },
    {
      label: 'Received by Stringer',
      date: currentIdx >= 2 ? formatDate(racquet.updated_at) : null,
      completed: currentIdx >= 2,
      current: currentIdx === 2,
    },
    {
      label: 'Completed / Ready for Pickup',
      date: currentIdx >= 3 ? formatDate(racquet.updated_at) : null,
      completed: currentIdx >= 3,
      current: currentIdx === 3,
    },
    {
      label: 'Waiting Pickup',
      date: currentIdx >= 4 ? formatDate(racquet.updated_at) : null,
      completed: currentIdx >= 4,
      current: currentIdx === 4,
    },
    {
      label: 'Pickup Completed',
      date: currentIdx >= 5 ? formatDate(racquet.updated_at) : null,
      completed: currentIdx >= 5,
      current: currentIdx === 5,
    },
  ];
}

export function TimelineDrawer({ open, onOpenChange, racquet }: TimelineDrawerProps) {
  if (!racquet) return null;

  const eventsFromStatus = getTimelineEventsFromStatusEvents(racquet);
  const events = eventsFromStatus ?? getSyntheticTimelineEvents(racquet);
  const isCancelled = racquet.status === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Order Timeline</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {racquet.member_name} — {racquet.racquet_type || 'N/A'}
          </p>
        </DialogHeader>

        <div className="py-4">
          {isCancelled ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-center">
              <p className="text-sm font-medium text-destructive">Order Cancelled</p>
              <p className="text-xs text-muted-foreground mt-1">This order has been cancelled</p>
            </div>
          ) : (
            <div className="relative pl-8 space-y-6">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />

              {events.map((event, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  {/* Icon */}
                  <div className="absolute -left-8 mt-0.5">
                    {event.current ? (
                      <Clock className="w-[22px] h-[22px] text-status-pending bg-card rounded-full" />
                    ) : event.completed ? (
                      <CheckCircle2 className="w-[22px] h-[22px] text-primary bg-card rounded-full" />
                    ) : (
                      <Circle className="w-[22px] h-[22px] text-muted-foreground/30 bg-card rounded-full" />
                    )}
                  </div>

                  <div>
                    <p className={`text-sm font-medium ${event.completed ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {event.label}
                    </p>
                    {event.date && (
                      <p className="text-xs text-muted-foreground">
                        {event.date}
                        {event.staffName ? ` \u2014 ${event.staffName}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
