import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRacquets,
  markReceivedByFrontDesk,
  recordPayment,
  markPickupCompleted,
} from '@/lib/api';
import { RacquetJob, normalizeStatusKey } from '@/types';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { DueStatusBadge } from '@/components/DueStatusBadge';
import { PickupCountdownBadge } from '@/components/PickupCountdownBadge';
import { EmptyState } from '@/components/EmptyState';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import { RecordPaymentDialog } from '@/components/admin/RecordPaymentDialog';
import { FrontDeskReceiveDialog } from '@/components/admin/FrontDeskReceiveDialog';
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
import { ClipboardCheck, DollarSign, Package, Paperclip, AlertTriangle, MonitorSmartphone } from 'lucide-react';

const ACTIVE_STATUSES = new Set([
  'received_front_desk', 'received', 'processing',
  'ready_for_stringing', 'ready-for-stringing',
  'received_by_stringer', 'received-by-stringer', 'in-progress',
  'stringing_completed', 'complete',
  'ready_for_pickup',
  'waiting_pickup', 'waiting-pickup',
]);

export default function FrontDeskDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const queryClient = useQueryClient();

  // Dialog states
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveRacquet, setReceiveRacquet] = useState<RacquetJob | null>(null);
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

  // Filter
  const filteredJobs = racquets.filter((r) => {
    const normalized = normalizeStatusKey(r.status);
    const isActive = ACTIVE_STATUSES.has(r.status ?? '') || ACTIVE_STATUSES.has(normalized);
    const matchesFilter = showCompleted ? !isActive : isActive;
    const matchesSearch =
      searchQuery === '' ||
      r.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  const handleFrontDeskReceive = (staffName: string) => {
    if (receiveRacquet) {
      markReceivedByFrontDesk(receiveRacquet.id, staffName)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['racquets'] });
          toast.success(`Received by ${staffName}`);
        })
        .catch(() => toast.error('Failed to mark as received'))
        .finally(() => { setReceiveDialogOpen(false); setReceiveRacquet(null); });
    }
  };

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
          <p className="text-muted-foreground">Intake, payments, and pickups.</p>
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
                title={showCompleted ? 'No completed jobs' : 'No active jobs'}
                description={showCompleted ? 'Completed jobs will appear here.' : 'Active jobs will appear here once customers drop off racquets.'}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Racquet</TableHead>
                    <TableHead>Drop-off</TableHead>
                    <TableHead>Due Status</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Amount</TableHead>
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
                    const isFullyPaid = amountPaid >= amountDue;
                    const canRecordPayment = balanceDue > 0;

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
                          <DueStatusBadge pickupDeadline={job.pickup_deadline} status={job.status} />
                        </TableCell>
                        <TableCell>
                          <PickupCountdownBadge readyForPickupAt={job.ready_for_pickup_at ?? null} status={job.status} />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {typeof job.amount_due === 'number' ? `$${job.amount_due.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <PaymentStatusBadge paymentStatus={job.payment_status as 'unpaid' | 'partial' | 'paid'} />
                            {!isFullyPaid && balanceDue > 0 && (
                              <span className="text-[10px] text-muted-foreground">${balanceDue.toFixed(2)} left</span>
                            )}
                          </div>
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
                              {(job.job_attachments?.length ?? 0) > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                                  {job.job_attachments!.length}
                                </span>
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" title="Receive"
                              onClick={() => { setReceiveRacquet(job); setReceiveDialogOpen(true); }}
                              className="opacity-60 group-hover:opacity-100"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </Button>
                            {canRecordPayment && (
                              <Button variant="ghost" size="icon" title="Record payment"
                                onClick={() => { setPayRacquet(job); setPayDialogOpen(true); }}
                                className="opacity-60 group-hover:opacity-100 text-primary"
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                            )}
                            {job.status !== 'delivered' && job.status !== 'pickup_completed' && (
                              <Button variant="ghost" size="icon"
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

        <FrontDeskReceiveDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen} racquet={receiveRacquet} onConfirm={handleFrontDeskReceive} />
        <RecordPaymentDialog open={payDialogOpen} onOpenChange={setPayDialogOpen} racquet={payRacquet} onConfirm={handleRecordPayment} />
        <PickupCompleteDialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen} racquet={pickupRacquet} onConfirm={handlePickupComplete} />
        <AttachmentsDialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen} racquet={attachRacquet} />
      </main>
    </div>
  );
}
