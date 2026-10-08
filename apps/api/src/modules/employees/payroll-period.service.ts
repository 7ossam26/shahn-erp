import { createHash } from 'node:crypto';
import {
  AccessError,
  calculatePayroll,
  resolveEffective,
  resolvePolicy,
  payrollEditReason,
} from '@shahn/domain';
import type { PayrollMonth, PayrollEarning, SalaryTerms } from '@shahn/contracts';
import {
  employeeClock,
  readEmployee,
  readEmployeePolicies,
  lockEmployeeCompany,
  lockPayrollControl,
  payrollControlRow,
  payrollEarnings,
  payrollObligations,
  payrollReviews,
  payrollPayment,
  reservePayroll,
  type TransactionClient,
} from '@shahn/database';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { canonical, digest } from '../access/crypto.js';

export type PayrollClock = (
  tx: TransactionClient,
) => Promise<{ today: string; month: string; now: Date }>;
export const databasePayrollClock: PayrollClock = employeeClock;
/** Explicit test seam; production never reads browser dates or a mutable global clock. */
export const controlledPayrollClock =
  (date: () => string): PayrollClock =>
  async () => ({ today: date(), month: date().slice(0, 7), now: new Date(date() + 'T12:00:00Z') });
const stableId = (key: string) => {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export async function lockPayrollEmployee(u: UnitOfWork, employee: string) {
  u.lockOrder('employee', '0:company:' + u.access.companyId);
  await lockEmployeeCompany(u.client, u.access.companyId);
  const row = await readEmployee(u.client, u.access.companyId, employee, true);
  if (!row) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(row.branch_id);
  const history = await u.client.query<{ branch_id: string }>(
    'SELECT DISTINCT branch_id FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2',
    [u.access.companyId, employee],
  );
  for (const b of history.rows) u.assertBranch(b.branch_id);
  return row;
}
/** Shared materializer for reads, payout and P08/P18 protected-period checks. Requires company guard. */
export async function materializePayroll(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
  clock: PayrollClock = databasePayrollClock,
): Promise<PayrollMonth> {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new AccessError('INVALID_PAYROLL_MONTH', 400);
  await lockPayrollControl(tx, company, employee, month);
  const p = await payrollControlRow(tx, company, employee, month),
    now = await clock(tx);
  const reviews = await payrollReviews(tx, company, employee);
  if (p.calculation)
    return {
      ...p.calculation,
      state: p.state,
      version: p.version,
      currentMonth: now.month,
      frozenAt: p.frozen_at!.toISOString(),
      reviews,
      obligations: await payrollObligations(tx, company, employee, month),
      blockers: reviews.some((r) => r.kind === 'source_conflict' && r.workMonth === month)
        ? ['SOURCE_REVIEW_REQUIRED']
        : p.calculation.blockers,
      payment: await payrollPayment(tx, company, employee, month),
    };
  if (p.state === 'paid' || p.state === 'zero_net_closed')
    throw new AccessError('LEGACY_PAYROLL_EVIDENCE_REQUIRED', 409);
  const e = await readEmployee(tx, company, employee);
  if (!e) throw new AccessError('NOT_FOUND', 404);
  const effective = month + '-01',
    branchDate = e.employment_start > effective ? e.employment_start : effective;
  const branch = resolveEffective(
    (
      await tx.query<{ id: string; branch_id: string; from: string; to: string | null }>(
        `SELECT id,branch_id,effective_from::text AS "from",effective_to::text AS "to" FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT superseded`,
        [company, employee],
      )
    ).rows,
    branchDate,
  );
  const policy = resolvePolicy(
    await readEmployeePolicies(tx, company, employee),
    'salary',
    effective,
  );
  const blockers: string[] = [];
  const earnings = await payrollEarnings(tx, company, employee, month),
    obligations = await payrollObligations(tx, company, employee, month);
  const employed =
    e.employment_start.slice(0, 7) <= month &&
    (!e.employment_end || e.employment_end.slice(0, 7) >= month);
  if (employed && policy.status !== 'resolved') blockers.push('SALARY_POLICY_UNRESOLVED');
  if (branch.status !== 'resolved') blockers.push('EMPLOYEE_BRANCH_UNRESOLVED');
  if (employed && policy.status === 'resolved') {
    const terms = policy.value.terms as SalaryTerms;
    earnings.unshift({
      id: stableId(company + employee + month),
      kind: 'salary',
      amountMinor: terms.enabled ? terms.monthly.amountMinor : '0',
      branchId: branch.status === 'resolved' ? branch.value.branch_id : e.branch_id,
      workDate: effective,
      recordedAt: policy.value.recordedAt,
      sourceId: policy.value.id,
      label: 'الراتب الشهري الكامل',
      visitId: null,
      policyId: policy.value.id,
    } satisfies PayrollEarning);
  }
  if (reviews.some((r) => r.kind === 'source_conflict' && r.workMonth === month))
    blockers.push('SOURCE_REVIEW_REQUIRED');
  const unresolved = (
    await tx.query(
      `SELECT 1 FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
   JOIN employees.employee_driver_link l ON(l.company_id,l.driver_id)=(v.company_id,v.driver_id) AND NOT l.superseded AND l.effective_from<=(v.work_at AT TIME ZONE 'Africa/Cairo')::date AND (l.effective_to IS NULL OR l.effective_to>(v.work_at AT TIME ZONE 'Africa/Cairo')::date)
   WHERE b.company_id=$1 AND l.employee_id=$2 AND to_char(v.work_at AT TIME ZONE 'Africa/Cairo','YYYY-MM')=$3 AND b.amount_minor IS NULL LIMIT 1`,
      [company, employee, month],
    )
  ).rowCount;
  if (unresolved) blockers.push('COMMISSION_SOURCE_UNRESOLVED');
  const calculation = calculatePayroll(month, earnings, obligations);
  const hash = digest(canonical({ month, earnings, obligations, blockers }));
  const snapshot: PayrollMonth = {
    employeeId: employee,
    employeeName: e.name,
    branchId: branch.status === 'resolved' ? branch.value.branch_id : e.branch_id,
    month,
    currentMonth: now.month,
    state: p.state,
    version: p.version,
    digest: hash,
    frozenAt: null,
    calculation,
    earnings,
    obligations,
    reviews,
    blockers,
    payment: null,
  };
  if (month < now.month && !blockers.length) {
    await reservePayroll(tx, company, snapshot);
    return materializePayroll(tx, company, employee, month, clock);
  }
  return snapshot;
}
export async function payrollMonth(
  u: UnitOfWork,
  employee: string,
  month: string,
  clock: PayrollClock = databasePayrollClock,
) {
  await lockPayrollEmployee(u, employee);
  // First processing freezes older materialized periods in calendar order, so their approved
  // recovery capacity cannot be silently reused by a new month.
  const past = (
    await u.client.query<{ month: string }>(
      `SELECT to_char(month,'YYYY-MM') AS month FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month<$3 AND calculation IS NULL AND state IN ('editable_unpaid','frozen_unpaid') ORDER BY month`,
      [u.access.companyId, employee, month + '-01'],
    )
  ).rows;
  for (const p of past) {
    // An unresolved old source holds that calculation only. It must not freeze an unrelated
    // newer calculation. Any valid originals still obey the same reserved/settled capacity.
    await materializePayroll(u.client, u.access.companyId, employee, p.month, clock);
  }
  const result = await materializePayroll(u.client, u.access.companyId, employee, month, clock);
  for (const x of [...result.earnings, ...result.obligations, ...result.reviews])
    u.assertBranch(x.branchId);
  for (const o of result.obligations)
    if (o.advancePayment) u.assertBranch(o.advancePayment.branchId);
  if (result.payment?.branchId) u.assertBranch(result.payment.branchId);
  return result;
}
export async function editablePayroll(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
  clock: PayrollClock = databasePayrollClock,
) {
  const p = await materializePayroll(tx, company, employee, month, clock),
    now = await clock(tx);
  const reason = payrollEditReason(month, p.state, now.now);
  if (reason) throw new AccessError(reason, 409);
  if (p.blockers.length) throw new AccessError('PAYROLL_REVIEW_REQUIRED', 409);
  return p;
}
