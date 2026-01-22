import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRacquets, updateRacquetStatus, deleteRacquet, fetchStrings, createString, updateString, deleteString } from '@/lib/api';
import { RacquetStatus, StringOption, RacquetJob } from '@/types';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
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
import { Plus, Pencil, Trash2, Package, Settings } from 'lucide-react';

const statusOptions: { value: RacquetStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'delivered', label: 'Delivered' },
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
              <p className="text-destructive mb-4">
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
                  <SelectTrigger className="sm:w-40">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Racquet</TableHead>
                      <TableHead>String</TableHead>
                      <TableHead>Drop-off</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Due Status</TableHead>
                      <TableHead>Tension</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {racquetsLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredRacquets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No racquets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRacquets.map((racquet) => (
                        <TableRow key={racquet.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{racquet.member_name}</p>
                              <p className="text-sm text-muted-foreground">{racquet.email}</p>
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
                          <TableCell>
                            {racquet.drop_in_date ? (() => {
                              try {
                                return format(parseISO(racquet.drop_in_date), 'MMM d, yyyy');
                              } catch {
                                return racquet.drop_in_date;
                              }
                            })() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {racquet.pickup_deadline ? (() => {
                              try {
                                return format(parseISO(racquet.pickup_deadline), 'MMM d, yyyy');
                              } catch {
                                return racquet.pickup_deadline;
                              }
                            })() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {/* Compute due status against local today */}
                            {(() => {
                              const today = (() => {
                                const d = new Date();
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${y}-${m}-${day}`;
                              })();

                              const deadline = racquet.pickup_deadline || '';
                              if ((racquet.status || '') !== 'delivered' && deadline) {
                                // Calculate days difference
                                const [deadlineYear, deadlineMonth, deadlineDay] = deadline.split('-').map(Number);
                                const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, deadlineDay);
                                const todayDate = new Date();
                                todayDate.setHours(0, 0, 0, 0);
                                deadlineDate.setHours(0, 0, 0, 0);
                                
                                const daysDiff = Math.floor((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                                if (daysDiff < 0) {
                                  // OVERDUE
                                  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive text-white">OVERDUE</span>;
                                } else if (daysDiff === 0) {
                                  // DUE TODAY
                                  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-black">DUE TODAY</span>;
                                } else if (daysDiff === 1) {
                                  // DUE IN 1 DAY (orange/warning)
                                  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white">DUE IN 1 DAY</span>;
                                } else if (daysDiff === 2) {
                                  // DUE IN 2 DAYS (yellow/amber)
                                  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-white">DUE IN 2 DAYS</span>;
                                } else if (daysDiff <= 7) {
                                  // DUE IN 3-7 DAYS (blue/info)
                                  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">DUE IN {daysDiff} DAYS</span>;
                                } else {
                                  // DUE IN 8+ DAYS (green/success)
                                  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">DUE IN {daysDiff} DAYS</span>;
                                }
                              }
                              return null;
                            })()}
                          </TableCell>
                          <TableCell>{racquet.string_tension ? `${racquet.string_tension} lbs` : 'N/A'}</TableCell>
                          <TableCell>
                            {racquet.status ? (
                              <StatusBadge status={racquet.status} />
                            ) : (
                              <StatusBadge status="processing" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={(racquet.status || 'processing') as RacquetStatus}
                                onValueChange={(value: RacquetStatus) =>
                                  updateStatusMutation.mutate({ id: racquet.id, status: value })
                                }
                              >
                                <SelectTrigger className="w-32">
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

                              {/* Quick action: mark delivered */}
                              {racquet.status !== 'delivered' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Mark delivered"
                                  onClick={() => updateStatusMutation.mutate({ id: racquet.id, status: 'delivered' })}
                                >
                                  <Package className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Delete racquet */}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete racquet"
                                onClick={() => {
                                  setRacquetToDelete(racquet);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Gauge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stringsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : strings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No strings added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      strings.map((string) => (
                        <TableRow key={string.id}>
                          <TableCell className="font-medium">{string.brand}</TableCell>
                          <TableCell>{string.name}</TableCell>
                          <TableCell>{string.gauge}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                string.active
                                  ? 'bg-status-complete-bg text-status-complete'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {string.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openStringDialog(string)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteStringMutation.mutate(string.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                  placeholder="e.g., Babolat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={stringForm.name}
                  onChange={(e) => setStringForm({ ...stringForm, name: e.target.value })}
                  placeholder="e.g., RPM Blast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gauge">Gauge</Label>
                <Input
                  id="gauge"
                  value={stringForm.gauge}
                  onChange={(e) => setStringForm({ ...stringForm, gauge: e.target.value })}
                  placeholder="e.g., 1.25mm"
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
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
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
      </main>
    </div>
  );
}
