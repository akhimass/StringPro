import { CheckCircle2, Receipt, Clock, CalendarDays, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DropOffConfirmationProps {
  ticketNumber: string;
  amountDue: number;
  onNewSubmission: () => void;
}

export function DropOffConfirmation({
  ticketNumber,
  amountDue,
  onNewSubmission,
}: DropOffConfirmationProps) {
  return (
    <div className="max-w-lg mx-auto py-12 animate-fade-in">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-status-complete-bg flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-status-complete" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Racquet Submitted!</h1>
        <p className="text-muted-foreground">
          Your racquet has been received and is being processed.
        </p>
      </div>

      {/* Ticket Card */}
      <div className="card-elevated p-6 space-y-5">
        {/* Ticket Number */}
        <div className="text-center pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ticket Number</p>
          <p className="text-2xl font-bold tracking-widest text-primary">{ticketNumber}</p>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-status-progress-bg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-status-progress" />
            </div>
            <div>
              <p className="text-sm font-medium">Expected Completion</p>
              <p className="text-sm text-muted-foreground">Ready in 48 hours</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-status-pending-bg flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-status-pending" />
            </div>
            <div>
              <p className="text-sm font-medium">Pickup Rule</p>
              <p className="text-sm text-muted-foreground">Must be picked up within 10 days of completion</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Amount Due</p>
              <p className="text-lg font-semibold text-primary">${amountDue.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Payment</p>
              <p className="text-sm text-muted-foreground">Payment due at front desk upon pickup</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="mt-8 text-center">
        <Button onClick={onNewSubmission} size="lg">
          Submit Another Racquet
        </Button>
      </div>
    </div>
  );
}
