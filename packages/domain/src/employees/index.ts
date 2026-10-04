import type {
  CommissionTerms,
  EmployeeFields,
  EmployeeTerms,
  PayrollState,
  PolicyRecord,
} from '@shahn/contracts';
import { validateEmployeeFields, validateEmployeeTerms } from '@shahn/contracts';
import { AccessError } from '../access.js';
import { minor, checkedMinor } from '../kernel.js';
export const cairoWorkDate = (at: Date) => {
  if (!Number.isFinite(at.getTime())) throw new AccessError('INVALID_WORK_TIME', 400);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
export function validateEmployeeProfile(fields: EmployeeFields) {
  if (
    !validateEmployeeFields(fields) ||
    (fields.employmentEnd && fields.employmentEnd < fields.employmentStart) ||
    (fields.weeklyDayOff !== null && fields.workDays.includes(fields.weeklyDayOff))
  )
    throw new AccessError('INVALID_EMPLOYEE_PROFILE', 400);
}
export function validateCompensation(terms: EmployeeTerms) {
  if (!validateEmployeeTerms(terms)) throw new AccessError('INVALID_COMPENSATION', 400);
  if (terms.salary.enabled) minor(terms.salary.monthly.amountMinor, 'nonnegative');
  if (terms.commission.enabled && terms.commission.formula === 'fixed')
    minor(terms.commission.perVisit.amountMinor, 'nonnegative');
}
/** Called once for an evidenced actual visit by P13. Uplift/payment/waiver never change the base. */
export function commissionPerVisit(
  baseMinor: string,
  terms: CommissionTerms,
  kind: 'actual_visit' | 'assignment' | 'preparation' | 'internal_transfer' = 'actual_visit',
) {
  const base = minor(baseMinor, 'nonnegative');
  validateCompensation({ salary: { enabled: false, monthly: null }, commission: terms });
  if (kind !== 'actual_visit' || !terms.enabled) return '0';
  if (terms.formula === 'fixed') return terms.perVisit.amountMinor;
  // BigInt intermediate is intentional; bounded base and 0..10000 bp give bounded result.
  return checkedMinor((base * BigInt(terms.basisPoints) + 5000n) / 10000n).toString();
}
export function payrollEditReason(month: string, state: PayrollState | null, now: Date) {
  const current = cairoWorkDate(now).slice(0, 7);
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) return 'INVALID_PAYROLL_MONTH';
  if (month < current) return 'PAST_PAYROLL_PROTECTED';
  if (state && state !== 'editable_unpaid') return 'PAYROLL_PERIOD_PROTECTED';
  return null;
}
export type TemporalResult<T> =
  { status: 'resolved'; value: T } | { status: 'unresolved'; reason: 'missing' | 'overlap' };
export function resolveEffective<
  T extends { from: string; to: string | null; superseded?: boolean },
>(rows: readonly T[], date: string): TemporalResult<T> {
  const hits = rows.filter((r) => !r.superseded && r.from <= date && (!r.to || date < r.to));
  return hits.length === 1
    ? { status: 'resolved', value: hits[0]! }
    : { status: 'unresolved', reason: hits.length ? 'overlap' : 'missing' };
}
export const resolvePolicy = (rows: PolicyRecord[], axis: PolicyRecord['axis'], workDate: string) =>
  resolveEffective(
    rows.filter((r) => r.axis === axis),
    workDate,
  );
