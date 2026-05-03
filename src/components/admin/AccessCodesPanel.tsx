import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSignupAccessCodes, createSignupAccessCode, deleteSignupAccessCode } from '@/lib/api';
import type { SignupAccessCode, SignupAccessCodeKind } from '@/types';
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
import { EmptyState } from '@/components/EmptyState';
import { KeyRound, Plus, RefreshCw, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const KIND_LABEL: Record<SignupAccessCodeKind, string> = {
  manager: 'Manager (all dashboards)',
  frontdesk: 'Front desk only',
  stringer: 'Stringer only',
  frontdesk_stringer: 'Front desk + stringer (combined)',
};

export function AccessCodesPanel() {
  const [kind, setKind] = useState<SignupAccessCodeKind>('frontdesk');
  const [maxUses, setMaxUses] = useState('1');
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['signup_access_codes'],
    queryFn: fetchSignupAccessCodes,
    // Global default staleTime is 5m; uses_remaining changes when staff sign up elsewhere — keep this fresh.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });

  const createMut = useMutation({
    mutationFn: () => {
      const n = Math.max(1, parseInt(maxUses, 10) || 1);
      return createSignupAccessCode(kind, n);
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['signup_access_codes'] });
      toast.success(`Code created: ${row.code} (${KIND_LABEL[row.code_kind as SignupAccessCodeKind]})`);
    },
    onError: (e: Error) => toast.error(e?.message || 'Failed to create code'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSignupAccessCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signup_access_codes'] });
      toast.success('Code removed');
    },
    onError: (e: Error) => toast.error(e?.message || 'Failed to remove'),
  });

  const copy = (c: string) => {
    void navigator.clipboard.writeText(c);
    toast.success('Copied to clipboard');
  };

  if (error) {
    return (
      <p className="text-sm text-destructive p-4">
        Could not load access codes. Run the latest database migration, then try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generate single-use (or multi-use) codes. Share the code with the new staff member for them to enter on the{' '}
        <span className="text-foreground font-medium">Admin → Create an account</span> flow. Manager codes grant full access; a combined
        code is for people who are both on front desk and stringing.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label>Code type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as SignupAccessCodeKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_LABEL) as SignupAccessCodeKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 w-28">
          <Label>Uses</Label>
          <Input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-2 shrink-0"
          title="Reload uses remaining from the server"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh list
        </Button>
        <Button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {createMut.isPending ? 'Generating…' : 'Generate code'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Loading codes…</p>
      ) : codes.length === 0 ? (
        <EmptyState icon={KeyRound} title="No codes yet" description="Generate a code to invite staff to sign up." />
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Uses left</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((row: SignupAccessCode) => {
                const k = row.code_kind as SignupAccessCodeKind;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm max-w-[200px]">{KIND_LABEL[k]}</TableCell>
                    <TableCell>
                      <code className="text-xs sm:text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                        {row.code}
                      </code>
                    </TableCell>
                    <TableCell>{row.uses_remaining}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {row.created_at
                        ? (() => {
                            try {
                              return format(parseISO(row.created_at), 'MMM d, yyyy p');
                            } catch {
                              return row.created_at;
                            }
                          })()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Copy"
                          onClick={() => copy(row.code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          title="Delete"
                          onClick={() => deleteMut.mutate(row.id)}
                          disabled={deleteMut.isPending}
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
        </div>
      )}
    </div>
  );
}
