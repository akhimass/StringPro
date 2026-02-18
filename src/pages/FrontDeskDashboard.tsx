import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRacquets,
  recordPayment,
  markPickupCompleted,
} from '@/lib/api';
import { RacquetJob, normalizeStatusKey } from '@/types';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { PickupCountdownBadge } from '@/components/PickupCountdownBadge';
import { EmptyState } from '@/components/EmptyState';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import { RecordPaymentDialog } from '@/components/admin/RecordPaymentDialog';
import { PickupCompleteDialog } from '@/components/admin/PickupCompleteDialog';
import { AttachmentsDialog } from '@/components/admin/AttachmentsDialog';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { DollarSign, Package, Paperclip, AlertTriangle, MonitorSmartphone } from 'lucide-react';

// Front desk sees: jobs that are completed/ready_for_pickup/waiting_pickup/overdue
// Toggle to show pickup_completed (done) jobs
const FRONT_DESK_ACTIVE_STATUSES = new Set([
  'stringing_completed',
  'ready_for_pickup',
  'waiting_pickup',
]);

export default function FrontDeskDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const queryClient = useQueryClient();

  // Dialog states
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payRacquet, setPayRacquet] = useState<RacquetJob | null>(null);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [pickupRacquet, setPickupRacquet] = useState<RacquetJob | null>(null);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachRacquet, setAttachRacquet] = useState<RacquetJob | null>(null);

  const { data: racquets = [], isLoading, error } = useQuery({
    queryKey: ['racquets'],
    queryFn: fetchRacquets,
    retry: 1,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, amount, staffName, paymentMethod }: { id: string; amount: number; staffName: string; paymentMethod?: string | null }) =>
      recordPayment(id, amount, staffName, paymentMethod),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      toast.success(`Payment of $${v.amount.toFixed(2)} recorded`);
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to record payment'),
  });

  // Filter: active = ready for pickup / waiting; completed = pickup_completed
  const filteredJobs = racquets.filter((r) => {
    const normalized = normalizeStatusKey(r.status);
    if (showCompleted) {
      if (normalized !== 'pickup_completed') return false;
    } else {
      if (!FRONT_DESK_ACTIVE_STATUSES.has(normalized)) return false;
    }
    const matchesSearch =
      searchQuery === '' ||
      r.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const handleRecordPayment = (amount: number, staffName: string, paymentMethod?: string | null) => {
    if (!payRacquet) return;
    recordPaymentMutation.mutate({ id: payRacquet.id, amount, staffName, paymentMethod }, {
      onSuccess: () => { setPayDialogOpen(false); setPayRacquet(null); },
    });
  };

  const handlePickupComplete = (data: { paymentVerified: boolean; staffName: string; signature: string; notes: string }) => {
    if (pickupRacquet) {
      const due = Number(pickupRacquet.amount_due) || 0;
      const paid = Number(pickupRacquet.amount_paid) || 0;
      if (paid < due) {
        toast.error(`Pay remaining $${(due - paid).toFixed(2)} before pickup`);
        return;
      }
      markPickupCompleted(pickupRacquet.id, data.staffName, data.signature)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['racquets'] });
          toast.success('Pickup completed');
        })
        .catch((err: Error) => toast.error(err?.message ?? 'Failed'))
        .finally(() => { setPickupDialogOpen(false); setPickupRacquet(null); });
    }
  };

  if (error) {
    return (
      <div className="page-container">
        <Header />
        <main className="content-container">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2">Front Desk</h1>
          </div>
          <div className="card-elevated p-6 text-center py-8">
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-destructive font-medium">Failed to load jobs.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <main className="content-container">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Front Desk</h1>
          <p className="text-muted-foreground">Payments and pickups for completed jobs.</p>
        </div>

        <div className="card-elevated">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Input
              placeholder="Search by name or ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="show-completed" className="text-sm text-muted-foreground">
                {showCompleted ? 'Completed' : 'Active'}
              </Label>
              <Switch
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filteredJobs.length === 0 ? (
              <EmptyState
                icon={MonitorSmartphone}
                title={showCompleted ? 'No completed pickups' : 'No jobs ready for pickup'}
                description={showCompleted ? 'Completed pickups will appear here.' : 'Jobs will appear here once stringing is completed.'}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Racquet</TableHead>
                    <TableHead>Drop-off</TableHead>
                    <TableHead>Pickup Timer</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const amountDue = Number(job.amount_due) || 0;
                    const amountPaid = Number(job.amount_paid) || 0;
                    const balanceDue = Math.max(0, amountDue - amountPaid);
                    const isFullyPaid = amountDue > 0 && amountPaid >= amountDue;
                    const canRecordPayment = balanceDue > 0;
                    const normalized = normalizeStatusKey(job.status);
                    const isPickupDone = normalized === 'pickup_completed';
                    const attachmentCount = job.job_attachments?.length ?? 0;

                    return (
                      <TableRow key={job.id} className="group">
                        <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                          {job.ticket_number || '—'}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{job.member_name}</p>
                          <p className="text-xs text-muted-foreground">{job.phone}</p>
                        </TableCell>
                        <TableCell className="font-medium">
                          {job.racquet_type?.replace(/\s+undefined\s*/gi, '').trim() || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.drop_in_date ? (() => { try { return format(parseISO(job.drop_in_date), 'MMM d, yyyy'); } catch { return job.drop_in_date; } })() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <PickupCountdownBadge readyForPickupAt={job.ready_for_pickup_at ?? null} status={job.status} />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          ${amountDue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          ${amountPaid.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {balanceDue > 0 ? (
                            <span className="text-status-pending font-medium">${balanceDue.toFixed(2)}</span>
                          ) : (
                            <span className="text-status-complete font-medium">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge paymentStatus={job.payment_status as 'unpaid' | 'partial' | 'paid'} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Attachments"
                              onClick={() => { setAttachRacquet(job); setAttachDialogOpen(true); }}
                              className="opacity-60 group-hover:opacity-100 relative"
                            >
                              <Paperclip className="w-4 h-4" />
                              {attachmentCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                                  {attachmentCount}
                                </span>
                              )}
                            </Button>
                            {canRecordPayment && (
                              <Button variant="ghost" size="icon" title="Record payment"
                                onClick={() => { setPayRacquet(job); setPayDialogOpen(true); }}
                                className="opacity-60 group-hover:opacity-100 text-primary"
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                            )}
                            {!isPickupDone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={isFullyPaid ? 'Complete pickup' : `Balance: $${balanceDue.toFixed(2)}`}
                                onClick={() => {
                                  if (!isFullyPaid) { toast.error(`Pay remaining $${balanceDue.toFixed(2)} first`); return; }
                                  setPickupRacquet(job); setPickupDialogOpen(true);
                                }}
                                className={isFullyPaid ? 'opacity-60 group-hover:opacity-100' : 'opacity-40 cursor-not-allowed'}
                                disabled={!isFullyPaid}
                              >
                                <Package className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <RecordPaymentDialog open={payDialogOpen} onOpenChange={setPayDialogOpen} racquet={payRacquet} onConfirm={handleRecordPayment} />
        <PickupCompleteDialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen} racquet={pickupRacquet} onConfirm={handlePickupComplete} />
        <AttachmentsDialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen} racquet={attachRacquet} />
      </main>
    </div>
  );
}
