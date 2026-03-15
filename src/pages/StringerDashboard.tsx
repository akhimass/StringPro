import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRacquets,
  fetchStringers,
  updateRacquetStatus,
} from '@/lib/api';
import { uploadMultipleJobPhotos } from '@/lib/attachments';
import { RacquetJob, RacquetStatus, normalizeStatusKey } from '@/types';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import { AttachmentsDialog } from '@/components/admin/AttachmentsDialog';
import { PhotoUploadSection } from '@/components/dropoff/PhotoUploadSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Wrench, Paperclip, Camera, AlertTriangle } from 'lucide-react';

export default function StringerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stringerFilter, setStringerFilter] = useState<string>('all');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Complete dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeJob, setCompleteJob] = useState<RacquetJob | null>(null);
  const [completedPhotos, setCompletedPhotos] = useState<File[]>([]);
  const [staffName, setStaffName] = useState('');

  // Attachments dialog
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachRacquet, setAttachRacquet] = useState<RacquetJob | null>(null);

  const { data: racquets = [], isLoading, error } = useQuery({
    queryKey: ['racquets'],
    queryFn: fetchRacquets,
    retry: 1,
  });

  const { data: stringers = [] } = useQuery({
    queryKey: ['stringers'],
    queryFn: fetchStringers,
    retry: 1,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RacquetStatus }) =>
      updateRacquetStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const monthYearOptions = (() => {
    const set = new Set<string>();
    racquets.forEach((r) => {
      if (r.drop_in_date) {
        try {
          const d = parseISO(r.drop_in_date);
          set.add(format(d, 'yyyy-MM'));
        } catch {
          /* ignore */
        }
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  })();

  // Filter: only ready_for_stringing and received_by_stringer
  const stringerJobs = racquets.filter((r) => {
    const normalized = normalizeStatusKey(r.status);
    const isStringerRelevant = normalized === 'ready_for_stringing' || normalized === 'received_by_stringer';
    const matchesStringer = stringerFilter === 'all' || r.stringer_id === stringerFilter;
    const matchesMonthYear =
      monthYearFilter === 'all' ||
      (r.drop_in_date && (() => {
        try {
          return format(parseISO(r.drop_in_date), 'yyyy-MM') === monthYearFilter;
        } catch {
          return false;
        }
      })());
    const matchesSearch =
      searchQuery === '' ||
      r.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.racquet_type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (r.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return isStringerRelevant && matchesStringer && matchesMonthYear && matchesSearch;
  });

  const getStringName = (job: RacquetJob): string => {
    if (job.strings) {
      const parts = [job.strings.brand || '', job.strings.name || '', job.strings.gauge ? `(${job.strings.gauge})` : ''].filter(Boolean);
      return parts.join(' ').trim() || 'Unknown';
    }
    return 'Unknown';
  };

  const handleMarkCompleted = async () => {
    if (!completeJob || !staffName.trim()) return;

    try {
      // Upload completed photos first
      if (completedPhotos.length > 0) {
        const { errors } = await uploadMultipleJobPhotos(completeJob.id, 'completed', completedPhotos, staffName.trim());
        if (errors.length > 0) {
          toast.warning(`${errors.length} photo(s) failed to upload.`);
        }
      }

      await updateStatusMutation.mutateAsync({ id: completeJob.id, status: 'stringing_completed' as RacquetStatus });
      toast.success('Job marked as Stringing Completed');
    } catch {
      toast.error('Failed to complete job');
    } finally {
      setCompleteDialogOpen(false);
      setCompleteJob(null);
      setCompletedPhotos([]);
      setStaffName('');
    }
  };

  if (error) {
    return (
      <div className="page-container">
        <Header />
        <main className="content-container">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2">Stringer Dashboard</h1>
          </div>
          <div className="card-elevated p-6">
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-destructive font-medium">Failed to load jobs.</p>
            </div>
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
          <h1 className="text-2xl font-semibold mb-2">Stringer Dashboard</h1>
          <p className="text-muted-foreground">Jobs assigned for stringing. Mark completed when done.</p>
        </div>

        <div className="card-elevated min-w-0">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name, racquet, or ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={stringerFilter} onValueChange={setStringerFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Stringer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stringers</SelectItem>
                {stringers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthYearFilter} onValueChange={setMonthYearFilter}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Month - Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthYearOptions.map((ym) => {
                  try {
                    const [y, m] = ym.split('-');
                    const label = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yyyy');
                    return <SelectItem key={ym} value={ym}>{label}</SelectItem>;
                  } catch {
                    return <SelectItem key={ym} value={ym}>{ym}</SelectItem>;
                  }
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="table-scroll-viewport">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
            ) : stringerJobs.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No jobs ready for stringing"
                description="Jobs assigned to you will appear here when they're ready."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Racquet</TableHead>
                    <TableHead>Drop-off date</TableHead>
                    <TableHead>Month - Year</TableHead>
                    <TableHead>String</TableHead>
                    <TableHead>Tension</TableHead>
                    <TableHead>Stringer</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stringerJobs.map((job) => {
                    const attachmentCount = job.job_attachments?.length ?? 0;
                    const amountDue = Number(job.amount_due) || 0;
                    const amountPaid = Number(job.amount_paid) || 0;
                    const balanceDue = Math.max(0, amountDue - amountPaid);
                    return (
                      <TableRow key={job.id} className="group">
                        <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                          {job.ticket_number || '—'}
                        </TableCell>
                        <TableCell className="font-medium">{job.member_name}</TableCell>
                        <TableCell className="font-medium">
                          {job.racquet_type?.replace(/\s+undefined\s*/gi, '').trim() || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.drop_in_date ? (() => { try { return format(parseISO(job.drop_in_date), 'MMM d, yyyy'); } catch { return job.drop_in_date; } })() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {job.drop_in_date ? (() => { try { return format(parseISO(job.drop_in_date), 'MMM yyyy'); } catch { return '—'; } })() : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{getStringName(job)}</TableCell>
                        <TableCell className="text-sm">
                          {job.string_tension ? `${job.string_tension} lbs` : 'N/A'}
                          {job.tension_override_lbs && (
                            <span className="block text-[10px] text-status-pending">
                              Override: {job.tension_override_lbs} lbs
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.stringers?.name?.trim() || job.assigned_stringer?.trim() || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {balanceDue > 0 ? (
                            <span className="text-status-pending font-medium">${balanceDue.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge paymentStatus={job.payment_status as 'unpaid' | 'partial' | 'paid'} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                          {job.string_power || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Attachments (view intake + upload completed photos) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View photos"
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
                            {/* Mark Completed */}
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => { setCompleteJob(job); setCompleteDialogOpen(true); }}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Complete
                            </Button>
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

        {/* Mark Completed Dialog */}
        <Dialog open={completeDialogOpen} onOpenChange={(open) => {
          if (!open) { setCompleteJob(null); setCompletedPhotos([]); setStaffName(''); }
          setCompleteDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Mark Stringing Completed
              </DialogTitle>
            </DialogHeader>
            {completeJob && (
              <div className="space-y-4 py-4">
                <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{completeJob.member_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Racquet</span>
                    <span className="font-medium">{completeJob.racquet_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tension</span>
                    <span className="font-medium">{completeJob.string_tension ? `${completeJob.string_tension} lbs` : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stringerStaffName">
                    Your Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stringerStaffName"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={100}
                  />
                </div>

                <PhotoUploadSection files={completedPhotos} onChange={setCompletedPhotos} label="Completed Photos (optional)" />

                {completedPhotos.length === 0 && (
                  <p className="text-xs text-status-pending">
                    ⚠ No completed photos attached. Consider adding photos of the finished job.
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleMarkCompleted} disabled={!staffName.trim() || updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Saving...' : 'Mark Completed'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attachments Dialog */}
        <AttachmentsDialog
          open={attachDialogOpen}
          onOpenChange={setAttachDialogOpen}
          racquet={attachRacquet}
        />
      </main>
    </div>
  );
}
