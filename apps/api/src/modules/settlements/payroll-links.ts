import { AccessError, payrollEditReason } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import {
  databasePayrollClock,
  editablePayroll,
  lockPayrollEmployee,
  materializePayroll,
  type PayrollClock,
} from '../employees/payroll-period.service.js';
import { JournalPosting } from '../kernel/journals.js';

/**
 * P21 bridge into P20 (ERP-D-083/191/202). Only the current unpaid or a future month accepts a new
 * original. Past and paid calculations, frozen reservations and original advances are untouched.
 */
export async function lockEmployeeForSettlement(u: UnitOfWork, employeeIds: readonly string[]) {
  for (const id of [...new Set(employeeIds)].sort()) {
    await lockPayrollEmployee(u, id);
    await new JournalPosting(u).lock('employee', id);
  }
}
/** Read-only guard for previews; materialization follows the same P20 rules as payroll reads. */
export async function payrollMonthBlocker(
  u: UnitOfWork,
  employeeId: string,
  month: string,
  clock: PayrollClock = databasePayrollClock,
) {
  const p = await materializePayroll(u.client, u.access.companyId, employeeId, month, clock);
  const reason = payrollEditReason(month, p.state, (await clock(u.client)).now);
  return { month: p, blocker: reason ?? (p.blockers.length ? 'PAYROLL_REVIEW_REQUIRED' : null) };
}
async function bump(u: UnitOfWork, employeeId: string, month: string) {
  await u.client.query(
    'UPDATE employees.payroll_period SET version=version+1 WHERE company_id=$1 AND employee_id=$2 AND month=$3',
    [u.access.companyId, employeeId, month + '-01'],
  );
}
/** One recoverable original in P20's ordinary order; recovery is never another cost reduction. */
export async function createSettlementObligation(
  u: UnitOfWork,
  input: {
    id: string;
    employeeId: string;
    month: string;
    amountMinor: string;
    effectiveDate: string;
    branchId: string;
    sourceId: string;
    kind: 'opening' | 'account_liability';
    label: string;
    clock?: PayrollClock | undefined;
  },
) {
  const company = u.access.companyId;
  u.assertBranch(input.branchId);
  await editablePayroll(u.client, company, input.employeeId, input.month, input.clock);
  await u.client.query(
    `INSERT INTO settlements.employee_obligation(company_id,id,employee_id,month,kind,amount_minor,effective_date,branch_id,source_id,label)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      company,
      input.id,
      input.employeeId,
      input.month + '-01',
      input.kind,
      input.amountMinor,
      input.effectiveDate,
      input.branchId,
      input.sourceId,
      input.label,
    ],
  );
  await u.client.query(
    `INSERT INTO employees.payroll_obligation(company_id,id,employee_id,month,kind,amount_minor,effective_date,branch_id,source_id,settlement_obligation_id)
     VALUES($1,$2,$3,$4,'settlement',$5,$6,$7,$8,$2)`,
    [
      company,
      input.id,
      input.employeeId,
      input.month + '-01',
      input.amountMinor,
      input.effectiveDate,
      input.branchId,
      input.sourceId,
    ],
  );
  await bump(u, input.employeeId, input.month);
}
/** A pre-ERP entitlement payable once by the ordinary single net payout; excluded from cost. */
export async function createOpeningEntitlement(
  u: UnitOfWork,
  input: {
    id: string;
    employeeId: string;
    month: string;
    amountMinor: string;
    workDate: string;
    branchId: string;
    sourceId: string;
    recordId: string;
    reason: string;
    clock?: PayrollClock | undefined;
  },
) {
  const company = u.access.companyId;
  u.assertBranch(input.branchId);
  await editablePayroll(u.client, company, input.employeeId, input.month, input.clock);
  await u.client.query(
    `INSERT INTO employees.payroll_adjustment(company_id,id,employee_id,month,kind,amount_minor,reason,work_date,branch_id,source_id,command_record_id,visit_id,actor_id)
     VALUES($1,$2,$3,$4,'opening_entitlement',$5,$6,$7,$8,$9,$10,NULL,$11)`,
    [
      company,
      input.id,
      input.employeeId,
      input.month + '-01',
      input.amountMinor,
      input.reason,
      input.workDate,
      input.branchId,
      input.sourceId,
      input.recordId,
      u.access.principalId,
    ],
  );
  await bump(u, input.employeeId, input.month);
}
export async function employeeLabel(u: UnitOfWork, employeeId: string) {
  const row = (
    await u.client.query<{ name: string; branch_id: string }>(
      'SELECT name,branch_id FROM employees.employee WHERE company_id=$1 AND id=$2',
      [u.access.companyId, employeeId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return row;
}
