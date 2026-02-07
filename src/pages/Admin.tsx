import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRacquets,
  updateRacquetStatus,
  deleteRacquet,
  fetchStrings,
  createString,
  updateString,
  deleteString,
  markReceivedByFrontDesk,
  markPaid,
  markPickupCompleted,
} from '@/lib/api';
import { RacquetStatus, StringOption, RacquetJob } from '@/types';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { DueStatusBadge } from '@/components/DueStatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { TimelineDrawer } from '@/components/TimelineDrawer';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import { MarkAsPaidDialog } from '@/components/admin/MarkAsPaidDialog';
import { FrontDeskReceiveDialog } from '@/components/admin/FrontDeskReceiveDialog';
import { PickupCompleteDialog } from '@/components/admin/PickupCompleteDialog';
import { format, parseISO } from 'date-fns';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Settings, Clock, AlertTriangle, ClipboardCheck, DollarSign } from 'lucide-react';

const statusOptions: { value: RacquetStatus; label: string }[] = [
  { value: 'received', label: 'Received by Front Desk' },
  { value: 'ready-for-stringing', label: 'Ready for Stringing' },
  { value: 'received-by-stringer', label: 'Received by Stringer' },
  { value: 'complete', label: 'Ready for Pickup' },
  { value: 'waiting-pickup', label: 'Waiting Pickup' },
  { value: 'delivered', label: 'Pickup Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'racquets';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // String dialog state
  const [stringDialogOpen, setStringDialogOpen] = useState(false);
  const [editingString, setEditingString] = useState<StringOption | null>(null);
  const [stringForm, setStringForm] = useState({ name: '', brand: '', gauge: '', active: true });

  // Delete racquet dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [racquetToDelete, setRacquetToDelete] = useState<RacquetJob | null>(null);

  // Timeline drawer state
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineRacquet, setTimelineRacquet] = useState<RacquetJob | null>(null);

  // Payment dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payRacquet, setPayRacquet] = useState<RacquetJob | null>(null);

  // Front desk receive dialog state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveRacquet, setReceiveRacquet] = useState<RacquetJob | null>(null);

  // Pickup complete dialog state
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [pickupRacquet, setPickupRacquet] = useState<RacquetJob | null>(null);

  // Mutations for payment helpers
  const markPaidMutation = useMutation({
    mutationFn: ({ id, staffName }: { id: string; staffName: string }) => markPaid(id, staffName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      toast.success('Payment marked as paid');
    },
    onError: (err: Error) => {
      const msg = err?.message ?? 'Failed to mark payment as paid';
      toast.error(msg);
      // eslint-disable-next-line no-console
      console.error('markPaid failed', err);
    },
  });

  // Queries
  const { data: racquets = [], isLoading: racquetsLoading, error: racquetsError } = useQuery({
    queryKey: ['racquets'],
    queryFn: fetchRacquets,
    retry: 1,
  });

  const { data: strings = [], isLoading: stringsLoading, error: stringsError } = useQuery({
    queryKey: ['strings'],
    queryFn: fetchStrings,
    retry: 1,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RacquetStatus }) =>
      updateRacquetStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const createStringMutation = useMutation({
    mutationFn: (data: Omit<StringOption, 'id'>) => createString(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strings'] });
      toast.success('String added');
      closeStringDialog();
    },
    onError: () => toast.error('Failed to add string'),
  });

  const updateStringMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StringOption> }) =>
      updateString(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strings'] });
      toast.success('String updated');
      closeStringDialog();
    },
    onError: () => toast.error('Failed to update string'),
  });

  const deleteStringMutation = useMutation({
    mutationFn: (id: string) => deleteString(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strings'] });
      toast.success('String deleted');
    },
    onError: () => toast.error('Failed to delete string'),
  });

  const deleteRacquetMutation = useMutation({
    mutationFn: (id: string) => deleteRacquet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      toast.success('Racquet deleted');
      setDeleteDialogOpen(false);
      setRacquetToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete racquet');
      setDeleteDialogOpen(false);
    },
  });

  // Helper to get string name for a racquet job
  const getStringName = (job: RacquetJob): string => {
    try {
      if (job.strings) {
        const parts = [
          job.strings.brand || '',
          job.strings.name || '',
          job.strings.gauge ? `(${job.strings.gauge})` : ''
        ].filter(Boolean);
        return parts.join(' ').trim() || 'Unknown';
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  // Filtered racquets
  const filteredRacquets = racquets.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      r.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.racquet_type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesStatus && matchesSearch;
  });

  // String dialog handlers
  const openStringDialog = (string?: StringOption) => {
    if (string) {
      setEditingString(string);
      setStringForm({
        name: string.name,
        brand: string.brand || '',
        gauge: string.gauge || '',
        active: string.active ?? true,
      });
    } else {
      setEditingString(null);
      setStringForm({ name: '', brand: '', gauge: '', active: true });
    }
    setStringDialogOpen(true);
  };

  const closeStringDialog = () => {
    setStringDialogOpen(false);
    setEditingString(null);
    setStringForm({ name: '', brand: '', gauge: '', active: true });
  };

  const handleStringSubmit = () => {
    if (!stringForm.name || !stringForm.brand || !stringForm.gauge) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingString) {
      updateStringMutation.mutate({ id: editingString.id, data: stringForm });
    } else {
      createStringMutation.mutate(stringForm);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Payment handlers
  const handleMarkAsPaid = (staffName: string) => {
    if (!payRacquet) return;
    markPaidMutation.mutate(
      { id: payRacquet.id, staffName },
      {
        onSuccess: () => {
          setPayDialogOpen(false);
          setPayRacquet(null);
        },
      }
    );
  };

  // Front desk receive handler
  const handleFrontDeskReceive = (staffName: string) => {
    if (receiveRacquet) {
      markReceivedByFrontDesk(receiveRacquet.id, staffName)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['racquets'] });
          toast.success(`Received by ${staffName} at front desk`);
        })
        .catch(() => {
          toast.error('Failed to mark as received by front desk');
        })
        .finally(() => {
          setReceiveDialogOpen(false);
          setReceiveRacquet(null);
        });
    }
  };

  // Pickup complete handler
  const handlePickupComplete = (data: { paymentVerified: boolean; staffName: string; signature: string; notes: string }) => {
    if (pickupRacquet) {
      if (pickupRacquet.payment_status !== 'paid') {
        toast.error('Cannot complete pickup for unpaid job. Please mark as paid first.');
        return;
      }

      markPickupCompleted(pickupRacquet.id, data.staffName, data.signature)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['racquets'] });
          toast.success(`Pickup completed — signed by ${data.signature}`);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to complete pickup');
        })
        .finally(() => {
          setPickupDialogOpen(false);
          setPickupRacquet(null);
        });
    }
  };

  // Show error state if queries fail
  if (racquetsError || stringsError) {
    return (
      <div className="page-container">
        <Header />
        <main className="content-container">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage racquet orders and string inventory.
            </p>
          </div>
          <div className="card-elevated p-6">
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-destructive font-medium mb-2">
                {racquetsError ? 'Failed to load racquets. ' : ''}
                {stringsError ? 'Failed to load strings.' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Please check your connection and try refreshing the page.
              </p>
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
          <h1 className="text-2xl font-semibold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage racquet orders and string inventory.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="racquets" className="gap-2">
              <Package className="w-4 h-4" />
              Racquets
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="racquets" className="animate-fade-in">
            <div className="card-elevated">
              <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Search by name or racquet type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                {racquetsLoading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
                ) : filteredRacquets.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No racquets found"
                    description={searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Racquet orders will appear here once customers submit drop-offs.'}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Racquet</TableHead>
                        <TableHead>String</TableHead>
                        <TableHead>Drop-off</TableHead>
                        <TableHead>Due Status</TableHead>
                        <TableHead>Tension</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRacquets.map((racquet) => {
                        const isPaid = racquet.payment_status === 'paid';
                        return (
                          <TableRow key={racquet.id} className="group">
                            <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                              {racquet.ticket_number || '—'}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{racquet.member_name}</p>
                                <p className="text-xs text-muted-foreground">{racquet.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">
                                {racquet.racquet_type
                                  ? racquet.racquet_type.replace(/\s+undefined\s*/gi, '').trim() || 'N/A'
                                  : 'N/A'}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm">{getStringName(racquet)}</TableCell>
                            <TableCell className="text-sm">
                              {racquet.drop_in_date ? (() => {
                                try {
                                  return format(parseISO(racquet.drop_in_date), 'MMM d, yyyy');
                                } catch {
                                  return racquet.drop_in_date;
                                }
                              })() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <DueStatusBadge
                                pickupDeadline={racquet.pickup_deadline}
                                status={racquet.status}
                              />
                            </TableCell>
                            <TableCell className="text-sm">{racquet.string_tension ? `${racquet.string_tension} lbs` : 'N/A'}</TableCell>
                            {/* Amount Due */}
                            <TableCell className="text-sm font-medium">
                              {typeof racquet.amount_due === 'number'
                                ? `$${racquet.amount_due.toFixed(2)}`
                                : '—'}
                            </TableCell>
                            {/* Payment Status */}
                            <TableCell>
                              <PaymentStatusBadge paid={isPaid} />
                            </TableCell>
                            <TableCell>
                              {racquet.status ? (
                                <StatusBadge status={racquet.status} />
                              ) : (
                                <StatusBadge status="received" />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Timeline */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View timeline"
                                  onClick={() => {
                                    setTimelineRacquet(racquet);
                                    setTimelineOpen(true);
                                  }}
                                  className="opacity-60 group-hover:opacity-100"
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>

                                {/* Front Desk Receive */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Received by front desk"
                                  onClick={() => {
                                    setReceiveRacquet(racquet);
                                    setReceiveDialogOpen(true);
                                  }}
                                  className="opacity-60 group-hover:opacity-100"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
                                </Button>

                                {/* Mark as Paid */}
                                {!isPaid && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Mark as paid"
                                    onClick={() => {
                                      setPayRacquet(racquet);
                                      setPayDialogOpen(true);
                                    }}
                                    className="opacity-60 group-hover:opacity-100 text-primary"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* Status selector */}
                                <Select
                                  value={(racquet.status || 'received') as RacquetStatus}
                                  onValueChange={(value: RacquetStatus) =>
                                    updateStatusMutation.mutate({ id: racquet.id, status: value })
                                  }
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* Pickup Complete */}
                                {racquet.status !== 'delivered' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Complete pickup"
                                    onClick={() => {
                                      setPickupRacquet(racquet);
                                      setPickupDialogOpen(true);
                                    }}
                                    className="opacity-60 group-hover:opacity-100"
                                  >
                                    <Package className="w-4 h-4" />
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete racquet"
                                  onClick={() => {
                                    setRacquetToDelete(racquet);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          </TabsContent>

          <TabsContent value="settings" className="animate-fade-in">
            <div className="card-elevated">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Strings</h2>
                  <p className="text-sm text-muted-foreground">Manage available string options</p>
                </div>
                <Button onClick={() => openStringDialog()} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add String
                </Button>
              </div>

              <div className="overflow-x-auto">
                {stringsLoading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
                ) : strings.length === 0 ? (
                  <EmptyState
                    icon={Settings}
                    title="No strings added yet"
                    description="Add your first string option to get started with racquet drop-offs."
                  >
                    <Button onClick={() => openStringDialog()} size="sm" variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Your First String
                    </Button>
                  </EmptyState>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Gauge</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Restock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {strings.map((string) => (
                        <TableRow key={string.id} className="group">
                          <TableCell className="font-medium">{string.brand}</TableCell>
                          <TableCell>{string.name}</TableCell>
                          <TableCell>{string.gauge}</TableCell>
                          {/* UI placeholder columns */}
                          <TableCell className="text-muted-foreground text-sm">—</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">—</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">—</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                string.active
                                  ? 'bg-status-complete-bg text-status-complete'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {string.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openStringDialog(string)}
                                className="opacity-60 group-hover:opacity-100"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteStringMutation.mutate(string.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* String Dialog */}
        <Dialog open={stringDialogOpen} onOpenChange={setStringDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingString ? 'Edit String' : 'Add New String'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={stringForm.brand}
                  onChange={(e) => setStringForm({ ...stringForm, brand: e.target.value })}
                  placeholder="e.g., Yonex"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={stringForm.name}
                  onChange={(e) => setStringForm({ ...stringForm, name: e.target.value })}
                  placeholder="e.g., BG65"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gauge">Gauge</Label>
                <Input
                  id="gauge"
                  value={stringForm.gauge}
                  onChange={(e) => setStringForm({ ...stringForm, gauge: e.target.value })}
                  placeholder="e.g., 0.70mm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={stringForm.active}
                  onCheckedChange={(checked) => setStringForm({ ...stringForm, active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeStringDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleStringSubmit}
                disabled={createStringMutation.isPending || updateStringMutation.isPending}
              >
                {editingString ? 'Save Changes' : 'Add String'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Racquet Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Racquet</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this racquet order? This action cannot be undone.
                {racquetToDelete && (
                  <div className="mt-2 p-3 bg-muted rounded-md border border-border/60 text-sm">
                    <p className="font-medium">{racquetToDelete.member_name}</p>
                    <p className="text-muted-foreground">{racquetToDelete.racquet_type || 'N/A'}</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRacquetToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (racquetToDelete) {
                    deleteRacquetMutation.mutate(racquetToDelete.id);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteRacquetMutation.isPending}
              >
                {deleteRacquetMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Timeline Drawer */}
        <TimelineDrawer
          open={timelineOpen}
          onOpenChange={setTimelineOpen}
          racquet={timelineRacquet}
        />

        {/* Mark as Paid Dialog */}
        <MarkAsPaidDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          racquet={payRacquet}
          amountDue={payRacquet?.amount_due ?? 0}
          onConfirm={handleMarkAsPaid}
        />

        {/* Front Desk Receive Dialog */}
        <FrontDeskReceiveDialog
          open={receiveDialogOpen}
          onOpenChange={setReceiveDialogOpen}
          racquet={receiveRacquet}
          onConfirm={handleFrontDeskReceive}
        />

        {/* Pickup Complete Dialog */}
        <PickupCompleteDialog
          open={pickupDialogOpen}
          onOpenChange={setPickupDialogOpen}
          racquet={pickupRacquet}
          onConfirm={handlePickupComplete}
        />
      </main>
    </div>
  );
}
