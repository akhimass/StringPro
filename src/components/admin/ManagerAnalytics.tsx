import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchRacquets, fetchStrings, fetchFrontDeskStaff } from '@/lib/api';
import {
  filterJobsForAnalytics,
  uniqueMonthYearsFromJobs,
  uniqueDropOffNamesFromJobs,
  aggregateByStringer,
  aggregateByStringCatalog,
  aggregatePaymentsByRecordingStaff,
  sumAmountPaid,
  sumAmountDue,
  countActiveJobs,
  countCompletedStringingJobs,
  type AnalyticsFilters,
} from '@/lib/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { DollarSign, Package, Users, Wrench, Banknote } from 'lucide-react';

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function ManagerAnalytics() {
  const { data: racquets = [], isLoading } = useQuery({
    queryKey: ['racquets'],
    queryFn: fetchRacquets,
    retry: 1,
  });

  const { data: strings = [] } = useQuery({
    queryKey: ['strings'],
    queryFn: fetchStrings,
    retry: 1,
  });

  const { data: frontDeskStaff = [] } = useQuery({
    queryKey: ['front_desk_staff'],
    queryFn: fetchFrontDeskStaff,
    retry: 1,
  });

  const [monthYear, setMonthYear] = useState<string>('all');
  const [stringId, setStringId] = useState<string>('all');
  const [dropOffName, setDropOffName] = useState<string>('all');

  const monthOptions = useMemo(() => uniqueMonthYearsFromJobs(racquets), [racquets]);

  const dropOffOptions = useMemo(() => {
    const fromJobs = uniqueDropOffNamesFromJobs(racquets);
    const fromSettings = frontDeskStaff.map((s) => s.name.trim()).filter(Boolean);
    const set = new Set<string>([...fromJobs, ...fromSettings]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [racquets, frontDeskStaff]);

  const filters: AnalyticsFilters = useMemo(
    () => ({
      monthYear,
      stringId,
      frontDeskDropOffName: dropOffName,
    }),
    [monthYear, stringId, dropOffName]
  );

  const filtered = useMemo(() => filterJobsForAnalytics(racquets, filters), [racquets, filters]);

  const totals = useMemo(() => {
    const collected = sumAmountPaid(filtered);
    const due = sumAmountDue(filtered);
    const active = countActiveJobs(filtered);
    const stringingDone = countCompletedStringingJobs(filtered);
    const outstanding = Math.max(0, due - collected);
    return { collected, due, active, stringingDone, outstanding };
  }, [filtered]);

  const byStringer = useMemo(() => aggregateByStringer(filtered), [filtered]);
  const byString = useMemo(() => aggregateByStringCatalog(filtered), [filtered]);
  const byPaymentStaff = useMemo(() => aggregatePaymentsByRecordingStaff(filtered), [filtered]);

  if (isLoading) {
    return (
      <div className="card-elevated p-12 text-center text-muted-foreground text-sm">Loading analytics…</div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-elevated p-4 border-b">
        <p className="text-sm text-muted-foreground mb-4">
          Filters apply to jobs by <strong>drop-in month</strong>, <strong>string product</strong>, and who
          registered the drop-off (<strong>front desk at registration</strong>). Payment totals show who{' '}
          <strong>recorded</strong> each payment on those jobs.
        </p>
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-[200px]">
            <Label>Month (drop-in)</Label>
            <Select value={monthYear} onValueChange={setMonthYear}>
              <SelectTrigger>
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All periods</SelectItem>
                {monthOptions.map((ym) => {
                  try {
                    const [y, m] = ym.split('-');
                    const label = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yyyy');
                    return (
                      <SelectItem key={ym} value={ym}>
                        {label}
                      </SelectItem>
                    );
                  } catch {
                    return (
                      <SelectItem key={ym} value={ym}>
                        {ym}
                      </SelectItem>
                    );
                  }
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[220px]">
            <Label>String (product)</Label>
            <Select value={stringId} onValueChange={setStringId}>
              <SelectTrigger>
                <SelectValue placeholder="String" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All strings</SelectItem>
                {strings.map((s) => {
                  const label = [s.brand, s.name, s.gauge ? `(${s.gauge})` : ''].filter(Boolean).join(' ');
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {label || s.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[220px]">
            <Label>Front desk (registration)</Label>
            <Select value={dropOffName} onValueChange={setDropOffName}>
              <SelectTrigger>
                <SelectValue placeholder="Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {dropOffOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active jobs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.active}</div>
            <CardDescription>Non-cancelled in scope</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stringing complete</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.stringingDone}</div>
            <CardDescription>Ready for pickup or later</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money collected</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtMoney(totals.collected)}</div>
            <CardDescription>Sum of payments recorded</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total & balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{fmtMoney(totals.due)}</div>
            <p className="text-xs text-muted-foreground mt-1">Amount due (jobs)</p>
            <p className="text-sm text-status-pending mt-2">Outstanding: {fmtMoney(totals.outstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              By stringer
            </CardTitle>
            <CardDescription>Jobs completed (stringing done) and revenue by assigned stringer</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stringer</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Amount due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStringer.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                      No data for current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  byStringer.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">{row.jobsCompleted}</TableCell>
                      <TableCell className="text-right">{row.jobCount}</TableCell>
                      <TableCell className="text-right">{fmtMoney(row.revenueCollected)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmtMoney(row.amountDueTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Payments by front desk
            </CardTitle>
            <CardDescription>Who recorded payments on jobs in scope (partial & full)</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff (recorded)</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPaymentStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-center py-8">
                      No payments in scope
                    </TableCell>
                  </TableRow>
                ) : (
                  byPaymentStaff.map((row) => (
                    <TableRow key={row.staffName}>
                      <TableCell className="font-medium">{row.staffName}</TableCell>
                      <TableCell className="text-right">{row.paymentCount}</TableCell>
                      <TableCell className="text-right">{fmtMoney(row.totalCollected)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            By string product
          </CardTitle>
          <CardDescription>Usage and revenue by string selection</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>String</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byString.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                    No data for current filters
                  </TableCell>
                </TableRow>
              ) : (
                byString.map((row) => (
                  <TableRow key={row.stringId ?? 'none'}>
                    <TableCell className="font-medium max-w-[280px] truncate" title={row.label}>
                      {row.label}
                    </TableCell>
                    <TableCell className="text-right">{row.jobCount}</TableCell>
                    <TableCell className="text-right">{row.completedCount}</TableCell>
                    <TableCell className="text-right">{fmtMoney(row.revenueCollected)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
