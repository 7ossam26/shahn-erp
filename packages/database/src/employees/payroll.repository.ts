import type {
  PayrollEarning,
  PayrollObligation,
  PayrollReview,
  PayrollPayment,
  PayrollMonth,
} from '@shahn/contracts';
import type { TransactionClient } from '../transaction.js';

/** Caller holds P08 company guard, employee row and period guards (ordered by month).
 * Lock originals by ID before any P09 account lock. Every amount is read on this same client.
 */
export async function payrollObligations(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
): Promise<PayrollObligation[]> {
  await tx.query(
    'SELECT id FROM employees.payroll_obligation WHERE company_id=$1 AND employee_id=$2 AND month<=$3 ORDER BY id FOR UPDATE',
    [company, employee, month + '-01'],
  );
  return (
    await tx.query<PayrollObligation>(
      `SELECT o.id,o.kind,o.source_id AS "sourceId",CASE o.kind WHEN 'incident' THEN 'مسؤولية حادث' WHEN 'advance' THEN 'سلفة مدفوعة' ELSE a.reason END AS "sourceLabel",
  to_char(o.month,'YYYY-MM') AS month,o.effective_date::text AS "effectiveDate",o.recorded_at::text AS "recordedAt",o.branch_id AS "branchId",o.amount_minor::text AS "amountMinor",
  o.outstanding_amount::text AS "outstandingAmount",o.reserved_for_frozen_periods::text AS "reservedForFrozenPeriods",o.available_for_new_allocation::text AS "availableForNewAllocation",
  CASE WHEN m.id IS NOT NULL THEN jsonb_build_object('branchId',m.branch_id,'accountId',m.account_id,'method',m.method,'actualDate',m.actual_date::text,'movementId',m.id,'reference',v.reference) ELSE NULL END AS "advancePayment",
  COALESCE((SELECT jsonb_agg(jsonb_build_object('month',to_char(r.month,'YYYY-MM'),'state',r.state,'amountMinor',r.amount_minor::text) ORDER BY r.month) FROM employees.payroll_recovery r WHERE r.company_id=o.company_id AND r.obligation_id=o.id),'[]'::jsonb) AS recoveries
  FROM employees.obligation_balance o LEFT JOIN employees.payroll_adjustment a ON(a.company_id,a.id)=(o.company_id,o.adjustment_id)
  LEFT JOIN employees.advance v ON(v.company_id,v.id)=(o.company_id,o.advance_id)
  LEFT JOIN finance.money_movement m ON(m.company_id,m.id)=(v.company_id,v.movement_id)
  WHERE o.company_id=$1 AND o.employee_id=$2 AND o.month<=$3 ORDER BY o.effective_date,o.recorded_at,o.id`,
      [company, employee, month + '-01'],
    )
  ).rows;
}
export async function payrollEarnings(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
): Promise<PayrollEarning[]> {
  return (
    await tx.query<PayrollEarning>(
      `SELECT a.id,a.kind,a.amount_minor::text AS "amountMinor",a.branch_id AS "branchId",a.work_date::text AS "workDate",a.recorded_at::text AS "recordedAt",a.source_id AS "sourceId",a.reason AS label,a.visit_id AS "visitId",NULL::uuid AS "policyId",NULL::jsonb AS "commissionBasis"
  FROM employees.payroll_adjustment a WHERE a.company_id=$1 AND a.employee_id=$2 AND a.month=$3
  UNION ALL SELECT v.id,'commission',b.amount_minor::text,v.branch_id,(v.work_at AT TIME ZONE 'Africa/Cairo')::date::text,b.created_at::text,v.source_record_id,'عمولة زيارة فعلية',v.id,(b.resolution->>'commissionPolicyId')::uuid,jsonb_build_object('baseMinor',v.price->>'baseShippingMinor','terms',b.resolution->'commission')
  FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
  WHERE b.company_id=$1 AND (b.resolution->>'employeeId')::uuid=$2 AND b.resolution->>'status'='resolved'
  AND b.journal_effect_id IS NOT NULL AND to_char(v.work_at AT TIME ZONE 'Africa/Cairo','YYYY-MM')=$4 ORDER BY "workDate",id`,
      [company, employee, month + '-01', month],
    )
  ).rows;
}
export async function payrollReviews(
  tx: TransactionClient,
  company: string,
  employee: string,
): Promise<PayrollReview[]> {
  return (
    await tx.query<PayrollReview>(
      `SELECT v.id,v.id AS "visitId",to_char(v.work_at AT TIME ZONE 'Africa/Cairo','YYYY-MM') AS "workMonth",(v.work_at AT TIME ZONE 'Africa/Cairo')::date::text AS "workDate",v.branch_id AS "branchId",
  'late_commission' AS kind,b.amount_minor::text AS "amountMinor",'0' AS "postedMinor",'عمولة عمل قديم تحتاج اعتماد تسوية مرتبطة' AS reason,to_char(a.month,'YYYY-MM') AS "resolvedMonth"
  FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
  LEFT JOIN employees.payroll_adjustment a ON(a.company_id,a.visit_id)=(b.company_id,b.visit_id)
  WHERE b.company_id=$1 AND b.resolution->>'reason'='protected_payroll_period' AND b.resolution->'captured'->>'employeeId'=$2
  UNION ALL SELECT r.id,v.id,to_char(v.work_at AT TIME ZONE 'Africa/Cairo','YYYY-MM'),(v.work_at AT TIME ZONE 'Africa/Cairo')::date::text,v.branch_id,
  'source_conflict',NULL,b.amount_minor::text,COALESCE(r.basis->>'reason','Source review'),NULL
  FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id)
  JOIN execution.earning_basis b ON(b.company_id,b.visit_id)=(v.company_id,v.id)
  WHERE r.company_id=$1 AND r.state='open' AND COALESCE(b.resolution->>'employeeId',b.resolution->'captured'->>'employeeId')=$2 ORDER BY "workDate",id`,
      [company, employee],
    )
  ).rows;
}
export async function payrollPayment(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
): Promise<PayrollPayment | null> {
  return (
    (
      await tx.query<PayrollPayment>(
        `SELECT (SELECT m.branch_id FROM finance.money_movement m WHERE m.company_id=employees.salary_payment.company_id AND m.id=employees.salary_payment.movement_id) AS "branchId",id,command_id AS "commandId",amount_minor::text AS "amountMinor",actual_date::text AS "actualDate",account_id AS "accountId",method,movement_id AS "movementId",reference,recorded_at::text AS "recordedAt" FROM employees.salary_payment WHERE company_id=$1 AND employee_id=$2 AND month=$3`,
        [company, employee, month + '-01'],
      )
    ).rows[0] ?? null
  );
}
export interface PayrollControlRow {
  state: PayrollMonth['state'];
  version: number;
  calculation: PayrollMonth | null;
  source_digest: string | null;
  frozen_at: Date | null;
}
export async function payrollControlRow(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
) {
  return (
    await tx.query<PayrollControlRow>(
      'SELECT state,version,calculation,source_digest,frozen_at FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month=$3 FOR UPDATE',
      [company, employee, month + '-01'],
    )
  ).rows[0]!;
}
export async function reservePayroll(
  tx: TransactionClient,
  company: string,
  snapshot: PayrollMonth,
) {
  for (const a of [...snapshot.calculation.allocations].sort((a, b) =>
    a.obligationId.localeCompare(b.obligationId),
  ))
    await tx.query(
      `INSERT INTO employees.payroll_recovery(company_id,employee_id,month,obligation_id,amount_minor,state) VALUES($1,$2,$3,$4,$5,'reserved')`,
      [company, snapshot.employeeId, snapshot.month + '-01', a.obligationId, a.amountMinor],
    );
  await tx.query(
    `UPDATE employees.payroll_period SET state='frozen_unpaid',version=version+1,calculation=$4,source_digest=$5,frozen_at=clock_timestamp() WHERE company_id=$1 AND employee_id=$2 AND month=$3`,
    [
      company,
      snapshot.employeeId,
      snapshot.month + '-01',
      JSON.stringify(snapshot),
      snapshot.digest,
    ],
  );
  for (const e of snapshot.earnings.filter((e) => e.kind === 'commission'))
    await tx.query(
      `INSERT INTO execution.protected_basis(company_id,visit_id,kind,reference_id) VALUES($1,$2,'payroll',$3) ON CONFLICT DO NOTHING`,
      [company, e.visitId, snapshot.employeeId],
    );
}
/** Typed P18 bridge. Original P18 obligation is never copied into a new debt identity. */
export async function acceptIncidentPayrollObligation(
  tx: TransactionClient,
  company: string,
  id: string,
) {
  // Upgrade harnesses can still execute the previous schema before applying P20. Production
  // startup requires all migrations; the P20 upgrade imports these actual P18 originals.
  if (
    !(
      await tx.query<{ present: string | null }>(
        "SELECT to_regclass('employees.payroll_obligation')::text AS present",
      )
    ).rows[0]!.present
  )
    return;
  await tx.query(
    `INSERT INTO employees.payroll_obligation(company_id,id,employee_id,month,kind,amount_minor,effective_date,branch_id,source_id,incident_obligation_id,recorded_at)
  SELECT company_id,id,employee_id,payroll_month,'incident',amount_minor,effective_date,incident_branch_id,source_id,id,recorded_at FROM employees.incident_obligation WHERE company_id=$1 AND id=$2 ON CONFLICT DO NOTHING`,
    [company, id],
  );
}
