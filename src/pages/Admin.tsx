import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRacquets, updateRacquetStatus, fetchStrings, createString, updateString, deleteString } from '@/lib/api';
import { RacquetStatus, StringOption, RacquetJob } from '@/types';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Settings } from 'lucide-react';

const statusOptions: { value: RacquetStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
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

  // Queries
  const { data: racquets = [], isLoading: racquetsLoading } = useQuery({
    queryKey: ['racquets'],
    queryFn: fetchRacquets,
  });

  const { data: strings = [], isLoading: stringsLoading } = useQuery({
    queryKey: ['strings'],
    queryFn: fetchStrings,
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

  // Helper to get string name for a racquet job
  const getStringName = (job: RacquetJob): string => {
    if (job.strings) {
      return `${job.strings.brand || ''} ${job.strings.name} ${job.strings.gauge || ''}`.trim();
    }
    return 'Unknown';
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
                      <TableHead>Tension</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {racquetsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredRacquets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                            <p className="font-medium">{racquet.racquet_type || 'N/A'}</p>
                          </TableCell>
                          <TableCell className="text-sm">{getStringName(racquet)}</TableCell>
                          <TableCell>{racquet.string_tension ? `${racquet.string_tension} lbs` : 'N/A'}</TableCell>
                          <TableCell>
                            <StatusBadge status={racquet.status || 'processing'} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={racquet.status || 'processing'}
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
      </main>
    </div>
  );
}
