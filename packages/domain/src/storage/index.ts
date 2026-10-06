import { AccessError } from '../access.js';
import { addMinor, minor, subtractMinor } from '../kernel.js';

/**
 * P19 storage subscriptions (ERP-D-048/192/201/204, ERP-R-201/210/213). Periods are Cairo local
 * half-open dates `[startDate, nextStartDate)` generated from the ORIGINAL start date, anchor day and
 * period index; a clamped short-month boundary is never the base of the next period.
 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Generous upper bound (1000 years of monthly periods) that keeps arithmetic exact and bounded. */
export const MAX_STORAGE_PERIOD_INDEX = 12000;
function parts(date: string): [number, number, number] {
  const m = DATE.exec(date);
  if (!m) throw new AccessError('INVALID_CALENDAR_DATE', 400);
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo))
    throw new AccessError('INVALID_CALENDAR_DATE', 400);
  return [y, mo, d];
}
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
const format = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export function isCalendarDate(date: string): boolean {
  try {
    parts(date);
    return true;
  } catch {
    return false;
  }
}
export function addCalendarDays(date: string, days: number): string {
  const [y, m, d] = parts(date);
  const value = new Date(Date.UTC(y, m - 1, d + days));
  return format(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}
function checkIndex(index: number) {
  if (!Number.isSafeInteger(index) || index < 0 || index > MAX_STORAGE_PERIOD_INDEX)
    throw new AccessError('INVALID_STORAGE_PERIOD_INDEX', 400);
}
/** Start of period `index`, preserving the original anchor: Jan 31 → Feb 28/29 → Mar 31. */
export function periodStart(originalStart: string, anchorDay: number, index: number): string {
  checkIndex(index);
  const [y, m, d] = parts(originalStart);
  if (d !== anchorDay) throw new AccessError('INVALID_STORAGE_ANCHOR', 400);
  const months = m - 1 + index,
    year = y + Math.floor(months / 12),
    month = (months % 12) + 1;
  return format(year, month, Math.min(anchorDay, daysInMonth(year, month)));
}
export interface StoragePeriodRange {
  index: number;
  startDate: string;
  /** Exclusive end; the next period's start. */
  nextStartDate: string;
  /** Inclusive display end (nextStartDate − 1 day). */
  endDate: string;
  /** The full fixed charge becomes due on the period start. */
  dueDate: string;
}
export function periodRange(
  originalStart: string,
  anchorDay: number,
  index: number,
): StoragePeriodRange {
  const startDate = periodStart(originalStart, anchorDay, index),
    nextStartDate = periodStart(originalStart, anchorDay, index + 1);
  return {
    index,
    startDate,
    nextStartDate,
    endDate: addCalendarDays(nextStartDate, -1),
    dueDate: startDate,
  };
}
/** Index of the period containing `date`, or −1 before the original start. */
export function periodIndexOn(originalStart: string, anchorDay: number, date: string): number {
  parts(date);
  if (date < periodStart(originalStart, anchorDay, 0)) return -1;
  const [sy, sm] = parts(originalStart),
    [y, m] = parts(date);
  let index = Math.max(0, (y - sy) * 12 + (m - sm));
  checkIndex(index);
  // A boundary may clamp inside the month; step back at most once.
  while (index > 0 && periodStart(originalStart, anchorDay, index) > date) index--;
  while (periodStart(originalStart, anchorDay, index + 1) <= date) index++;
  return index;
}
/** First period that starts on/after the agreement entry date. Earlier periods are historical. */
export function firstBillableIndex(
  originalStart: string,
  anchorDay: number,
  entryDate: string,
): number {
  const current = periodIndexOn(originalStart, anchorDay, entryDate);
  if (current < 0) return 0;
  return periodStart(originalStart, anchorDay, current) >= entryDate ? current : current + 1;
}
/** A fee/branch change entered on `today` applies from the next subscription period. */
export function changeEffectiveIndex(
  originalStart: string,
  anchorDay: number,
  today: string,
): number {
  return periodIndexOn(originalStart, anchorDay, today) + 1;
}
/**
 * Stop records the current protected period's exclusive end. Before service starts, the boundary
 * is the original start, so no period (and no earned charge) is ever generated.
 */
export function stopBoundary(originalStart: string, anchorDay: number, today: string): string {
  const current = periodIndexOn(originalStart, anchorDay, today);
  return current < 0
    ? periodStart(originalStart, anchorDay, 0)
    : periodStart(originalStart, anchorDay, current + 1);
}
export interface StorageSchedule {
  startDate: string;
  anchorDay: number;
  firstBillableIndex: number;
  stopBoundary: string | null;
  /** Highest generated period index, or null before the first generated period. */
  lastGeneratedIndex: number | null;
}
/** The single next period to generate, only when its start date has arrived. */
export function nextDuePeriod(s: StorageSchedule, today: string): StoragePeriodRange | null {
  const index = s.lastGeneratedIndex === null ? s.firstBillableIndex : s.lastGeneratedIndex + 1;
  if (index > MAX_STORAGE_PERIOD_INDEX) return null;
  const range = periodRange(s.startDate, s.anchorDay, index);
  if (range.startDate > today) return null;
  if (s.stopBoundary !== null && range.startDate >= s.stopBoundary) return null;
  return range;
}
export interface StorageRevisionTerms {
  revision: number;
  effectivePeriodIndex: number;
  feeMinor: string;
  branchId: string;
}
/** The latest recorded revision whose effect began at or before this period. */
export function revisionFor<T extends StorageRevisionTerms>(
  revisions: readonly T[],
  index: number,
): T {
  const applicable = revisions
    .filter((r) => r.effectivePeriodIndex <= index)
    .sort((a, b) => b.revision - a.revision)[0];
  if (!applicable) throw new AccessError('STORAGE_TERMS_MISSING', 409);
  return applicable;
}

// ---- Exact money formulas -------------------------------------------------------------------

/** periodOutstanding = periodFee + linkedChargeAdjustments − netPaymentAllocations. */
export function periodOutstanding(
  feeMinor: string,
  chargeAdjustmentsMinor: string,
  netAllocationsMinor: string,
): bigint {
  const value = subtractMinor(
    addMinor(minor(feeMinor, 'nonnegative'), minor(chargeAdjustmentsMinor)),
    minor(netAllocationsMinor, 'nonnegative'),
  );
  if (value < 0n) throw new AccessError('STORAGE_PERIOD_OVER_ALLOCATED', 409);
  return value;
}
/** unallocatedCredit = receipts + linkedCreditCorrections − netPeriodAllocations − refunds. */
export function unallocatedCredit(
  receiptsMinor: string,
  creditCorrectionsMinor: string,
  netAllocationsMinor: string,
  refundsMinor: string,
): bigint {
  const value = subtractMinor(
    subtractMinor(
      addMinor(minor(receiptsMinor, 'nonnegative'), minor(creditCorrectionsMinor)),
      minor(netAllocationsMinor, 'nonnegative'),
    ),
    minor(refundsMinor, 'nonnegative'),
  );
  if (value < 0n) throw new AccessError('STORAGE_CREDIT_NEGATIVE', 409);
  return value;
}
export type StoragePaymentStatus = 'unpaid' | 'partial' | 'paid';
export function periodPaymentStatus(
  chargeMinor: bigint,
  outstanding: bigint,
): StoragePaymentStatus {
  if (outstanding === 0n) return 'paid';
  return outstanding === chargeMinor ? 'unpaid' : 'partial';
}
/** Due at the period start; overdue only after that date with a remaining charge. */
export function isOverdue(outstanding: bigint, dueDate: string, today: string): boolean {
  return outstanding > 0n && dueDate < today;
}
export interface OpenStoragePeriod {
  id: string;
  dueDate: string;
  outstandingMinor: string;
}
export interface StorageCreditLot {
  id: string;
  actualDate: string;
  unallocatedMinor: string;
}
export interface PlannedStorageAllocation {
  periodId: string;
  receiptId: string;
  amountMinor: string;
}
const byPeriod = (a: OpenStoragePeriod, b: OpenStoragePeriod) =>
  a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const byLot = (a: StorageCreditLot, b: StorageCreditLot) =>
  a.actualDate < b.actualDate
    ? -1
    : a.actualDate > b.actualDate
      ? 1
      : a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0;
/**
 * Approved deterministic rule: unpaid periods in ascending due date then period ID, each capped
 * by its outstanding charge; available receipt lots are consumed in effective receipt date then
 * receipt ID order. Surplus stays unallocated advance credit.
 */
export function planStorageAllocations(
  periods: readonly OpenStoragePeriod[],
  lots: readonly StorageCreditLot[],
): {
  allocations: PlannedStorageAllocation[];
  totalMinor: string;
  outstandingAfter: Record<string, string>;
  unallocatedAfter: Record<string, string>;
} {
  const open = [...periods].sort(byPeriod).map((p) => ({
    id: p.id,
    left: minor(p.outstandingMinor, 'nonnegative'),
  }));
  const credit = [...lots].sort(byLot).map((l) => ({
    id: l.id,
    left: minor(l.unallocatedMinor, 'nonnegative'),
  }));
  const allocations: PlannedStorageAllocation[] = [];
  let total = 0n,
    lot = 0;
  for (const period of open) {
    while (period.left > 0n && lot < credit.length) {
      const source = credit[lot]!;
      if (source.left === 0n) {
        lot++;
        continue;
      }
      const amount = period.left < source.left ? period.left : source.left;
      period.left -= amount;
      source.left -= amount;
      total = addMinor(total, amount);
      allocations.push({
        periodId: period.id,
        receiptId: source.id,
        amountMinor: amount.toString(),
      });
    }
  }
  return {
    allocations,
    totalMinor: total.toString(),
    outstandingAfter: Object.fromEntries(open.map((p) => [p.id, p.left.toString()])),
    unallocatedAfter: Object.fromEntries(credit.map((l) => [l.id, l.left.toString()])),
  };
}
/** Refund draws only unallocated credit, from receipt lots in effective date then ID order. */
export function planStorageRefundSources(
  lots: readonly StorageCreditLot[],
  amountMinor: string,
): { receiptId: string; amountMinor: string }[] {
  let left = minor(amountMinor, 'positive');
  const sources: { receiptId: string; amountMinor: string }[] = [];
  for (const lot of [...lots].sort(byLot)) {
    if (left === 0n) break;
    const available = minor(lot.unallocatedMinor, 'nonnegative');
    if (available === 0n) continue;
    const amount = left < available ? left : available;
    left -= amount;
    sources.push({ receiptId: lot.id, amountMinor: amount.toString() });
  }
  if (left !== 0n) throw new AccessError('INSUFFICIENT_STORAGE_CREDIT', 409);
  return sources;
}
