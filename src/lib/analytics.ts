import { format, parseISO } from 'date-fns';
import { type RacquetJob, normalizeStatusKey } from '@/types';

export type AnalyticsFilters = {
  /** `all` or `yyyy-MM` from drop-in date */
  monthYear: string;
  /** `all` or string catalog id */
  stringId: string;
  /** `all` or exact drop-off staff name (from registration) */
  frontDeskDropOffName: string;
};

export function isJobCancelled(job: RacquetJob): boolean {
  return normalizeStatusKey(job.status) === 'cancelled';
}

/** Stringing finished — job reached pickup flow or later. */
export function isStringingWorkComplete(job: RacquetJob): boolean {
  const k = normalizeStatusKey(job.status);
  return (
    k === 'stringing_completed' ||
    k === 'ready_for_pickup' ||
    k === 'waiting_pickup' ||
    k === 'pickup_completed'
  );
}

export function filterJobsForAnalytics(
  jobs: RacquetJob[],
  f: AnalyticsFilters
): RacquetJob[] {
  return jobs.filter((r) => {
    if (f.monthYear !== 'all') {
      if (!r.drop_in_date) return false;
      try {
        if (format(parseISO(r.drop_in_date), 'yyyy-MM') !== f.monthYear) return false;
      } catch {
        return false;
      }
    }
    if (f.stringId !== 'all' && r.string_id !== f.stringId) return false;
    if (f.frontDeskDropOffName !== 'all') {
      const staff = (r.drop_off_by_staff ?? '').trim();
      if (staff !== f.frontDeskDropOffName.trim()) return false;
    }
    return true;
  });
}

export function uniqueMonthYearsFromJobs(jobs: RacquetJob[]): string[] {
  const set = new Set<string>();
  for (const r of jobs) {
    if (!r.drop_in_date) continue;
    try {
      set.add(format(parseISO(r.drop_in_date), 'yyyy-MM'));
    } catch {
      /* ignore */
    }
  }
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function uniqueDropOffNamesFromJobs(jobs: RacquetJob[]): string[] {
  const set = new Set<string>();
  for (const r of jobs) {
    const n = (r.drop_off_by_staff ?? '').trim();
    if (n) set.add(n);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function stringerLabel(job: RacquetJob): string {
  if (job.stringers?.name) return job.stringers.name;
  if (job.stringer_id) return `Stringer (${job.stringer_id.slice(0, 8)}…)`;
  return 'Default stringer';
}

function stringerKey(job: RacquetJob): string {
  return job.stringer_id ?? '__default__';
}

export type StringerAggregateRow = {
  key: string;
  label: string;
  jobsCompleted: number;
  jobCount: number;
  revenueCollected: number;
  amountDueTotal: number;
};

export function aggregateByStringer(jobs: RacquetJob[]): StringerAggregateRow[] {
  const map = new Map<
    string,
    { label: string; jobsCompleted: number; jobCount: number; revenue: number; due: number }
  >();

  for (const job of jobs) {
    if (isJobCancelled(job)) continue;
    const key = stringerKey(job);
    const label = stringerLabel(job);
    if (!map.has(key)) {
      map.set(key, { label, jobsCompleted: 0, jobCount: 0, revenue: 0, due: 0 });
    }
    const row = map.get(key)!;
    row.jobCount += 1;
    if (isStringingWorkComplete(job)) row.jobsCompleted += 1;
    row.revenue += Number(job.amount_paid) || 0;
    row.due += Number(job.amount_due) || 0;
  }

  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      jobsCompleted: v.jobsCompleted,
      jobCount: v.jobCount,
      revenueCollected: v.revenue,
      amountDueTotal: v.due,
    }))
    .sort((a, b) => b.revenueCollected - a.revenueCollected);
}

export type StringAggregateRow = {
  stringId: string | null;
  label: string;
  jobCount: number;
  completedCount: number;
  revenueCollected: number;
};

function stringLabel(job: RacquetJob): string {
  if (job.strings) {
    const parts = [job.strings.brand, job.strings.name, job.strings.gauge ? `(${job.strings.gauge})` : ''].filter(
      Boolean
    ) as string[];
    return parts.join(' ').trim() || 'Unknown string';
  }
  return job.string_id ? `String ${job.string_id.slice(0, 8)}…` : 'No string';
}

export function aggregateByStringCatalog(jobs: RacquetJob[]): StringAggregateRow[] {
  const map = new Map<
    string,
    { label: string; jobCount: number; completed: number; revenue: number }
  >();

  for (const job of jobs) {
    if (isJobCancelled(job)) continue;
    const sid = job.string_id ?? '__none__';
    const label = stringLabel(job);
    if (!map.has(sid)) {
      map.set(sid, { label, jobCount: 0, completed: 0, revenue: 0 });
    }
    const row = map.get(sid)!;
    row.jobCount += 1;
    if (isStringingWorkComplete(job)) row.completed += 1;
    row.revenue += Number(job.amount_paid) || 0;
  }

  return Array.from(map.entries())
    .map(([stringId, v]) => ({
      stringId: stringId === '__none__' ? null : stringId,
      label: v.label,
      jobCount: v.jobCount,
      completedCount: v.completed,
      revenueCollected: v.revenue,
    }))
    .sort((a, b) => b.jobCount - a.jobCount);
}

export type PaymentStaffRow = {
  staffName: string;
  totalCollected: number;
  paymentCount: number;
};

/** Payments recorded on jobs in scope (who rang the sale). */
export function aggregatePaymentsByRecordingStaff(jobs: RacquetJob[]): PaymentStaffRow[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const job of jobs) {
    if (isJobCancelled(job)) continue;
    for (const pe of job.payment_events ?? []) {
      const name = (pe.staff_name ?? '').trim() || 'Unknown';
      if (!map.has(name)) map.set(name, { total: 0, count: 0 });
      const row = map.get(name)!;
      row.total += Number(pe.amount) || 0;
      row.count += 1;
    }
  }
  return Array.from(map.entries())
    .map(([staffName, v]) => ({
      staffName,
      totalCollected: v.total,
      paymentCount: v.count,
    }))
    .sort((a, b) => b.totalCollected - a.totalCollected);
}

export function sumAmountPaid(jobs: RacquetJob[]): number {
  return jobs.filter((j) => !isJobCancelled(j)).reduce((s, j) => s + (Number(j.amount_paid) || 0), 0);
}

export function sumAmountDue(jobs: RacquetJob[]): number {
  return jobs.filter((j) => !isJobCancelled(j)).reduce((s, j) => s + (Number(j.amount_due) || 0), 0);
}

export function countActiveJobs(jobs: RacquetJob[]): number {
  return jobs.filter((j) => !isJobCancelled(j)).length;
}

export function countCompletedStringingJobs(jobs: RacquetJob[]): number {
  return jobs.filter((j) => !isJobCancelled(j) && isStringingWorkComplete(j)).length;
}
