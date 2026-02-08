import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RacquetJob, StatusEvent, PaymentEvent } from '@/types';
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
  /** For payment_events */
  amount?: number | null;
  paymentMethod?: string | null;
  sortKey?: number; // for merge-sort by timestamp (merged timeline)
}

const CANONICAL_STEPS = [
  { key: 'received_front_desk', label: 'Received by Front Desk' },
  { key: 'ready_for_stringing', label: 'Ready for Stringing' },
  { key: 'received_by_stringer', label: 'Received by Stringer' },
  { key: 'completed_ready_for_pickup', label: 'Completed / Ready for Pickup' },
  { key: 'waiting_pickup', label: 'Waiting Pickup' },
  { key: 'pickup_completed', label: 'Pickup Completed' },
] as const;

const EXTRA_EVENTS = [
  { key: 'mark_paid', label: 'Payment Marked Paid' },
  { key: 'payment_recorded', label: 'Payment Recorded' },
  { key: 'created', label: 'Order Created' },
] as const;

function formatDate(d: string | null): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), 'MMM d, yyyy h:mm a');
  } catch {
    return d;
  }
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  received_front_desk: 'Received by Front Desk',
  ready_for_stringing: 'Ready for Stringing',
  received_by_stringer: 'Received by Stringer',
  completed_ready_for_pickup: 'Completed / Ready for Pickup',
  completed: 'Completed / Ready for Pickup',
  waiting_pickup: 'Waiting Pickup',
  pickup_completed: 'Pickup Completed',
  mark_paid: 'Payment Marked Paid',
  payment_recorded: 'Payment Recorded',
  created: 'Order Created',
};

/** Build merged timeline from status_events + payment_events, sorted by timestamp. */
function getMergedTimelineEvents(racquet: RacquetJob): TimelineEvent[] {
  const items: TimelineEvent[] = [];
  const statusEvents = racquet.status_events ?? [];
  const paymentEvents = racquet.payment_events ?? [];

  for (const ev of statusEvents) {
    const label = EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type.replace(/_/g, ' ');
    const createdAt = ev.created_at ? new Date(ev.created_at).getTime() : 0;
    items.push({
      label,
      date: formatDate(ev.created_at),
      staffName: ev.staff_name ?? null,
      completed: true,
      current: false,
      sortKey: createdAt,
    });
  }

  for (const pe of paymentEvents as PaymentEvent[]) {
    const createdAt = pe.created_at ? new Date(pe.created_at).getTime() : 0;
    const amount = typeof pe.amount === 'number' ? pe.amount : Number(pe.amount);
    const method = pe.payment_method ?? null;
    items.push({
      label: 'Payment Recorded',
      date: formatDate(pe.created_at),
      staffName: pe.staff_name ?? null,
      completed: true,
      current: false,
      amount: Number.isFinite(amount) ? amount : null,
      paymentMethod: method,
      sortKey: createdAt,
    });
  }

  items.sort((a, b) => a.sortKey - b.sortKey);

  // Mark current = first incomplete canonical step (by latest status), or last item
  const stepKeys = CANONICAL_STEPS.map((s) => s.key);
  const lastStepIndex = stepKeys.reduce((idx, key, i) => {
    const hasEvent = statusEvents.some(
      (e) => e.event_type === key || (key === 'completed_ready_for_pickup' && e.event_type === 'completed')
    );
    return hasEvent ? i : idx;
  }, -1);
  const currentStepIdx = lastStepIndex + 1;
  const currentLabel =
    currentStepIdx < CANONICAL_STEPS.length
      ? CANONICAL_STEPS[currentStepIdx].label
      : items.length ? items[items.length - 1].label : null;
  for (let i = 0; i < items.length; i++) {
    items[i].current = !!currentLabel && items[i].label === currentLabel && i === items.length - 1;
  }
  if (items.length && !items.some((e) => e.current)) items[items.length - 1].current = true;

  return items;
}

function getTimelineEventsFromStatusEvents(racquet: RacquetJob): TimelineEvent[] | null {
  const events = racquet.status_events;
  const hasPaymentEvents = racquet.payment_events && racquet.payment_events.length > 0;
  if ((!events || events.length === 0) && !hasPaymentEvents) return null;

  return getMergedTimelineEvents(racquet);
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
                      {event.amount != null && Number.isFinite(event.amount) && (
                        <span className="text-muted-foreground font-normal ml-1">
                          (${Number(event.amount).toFixed(2)}
                          {event.paymentMethod ? ` · ${event.paymentMethod}` : ''})
                        </span>
                      )}
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
