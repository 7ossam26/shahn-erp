import type {
  EmployeeFields,
  PolicyRecord,
  SalaryTerms,
  CommissionTerms,
  PayrollState,
} from '@shahn/contracts';
import type { TransactionClient } from '../transaction.js';
export interface EmployeeRow {
  id: string;
  reference: string;
  version: number;
  name: string;
  contact: string;
  active: boolean;
  employment_start: string;
  employment_end: string | null;
  branch_id: string;
  work_days: number[];
  hours_per_day: string;
  weekly_day_off: number | null;
  last_accepted_work_date: string | null;
}
const selectEmployee = `SELECT *,employment_start::text,employment_end::text,last_accepted_work_date::text FROM employees.employee`;
export async function readEmployee(
  tx: TransactionClient,
  company: string,
  id: string,
  lock = false,
) {
  return (
    await tx.query<EmployeeRow>(
      `${selectEmployee} WHERE company_id=$1 AND id=$2 ${lock ? 'FOR UPDATE' : ''}`,
      [company, id],
    )
  ).rows[0];
}
/** Materialized missing-row guard; all P08 mutation and P13 acceptance consumers lock this first. */
export async function lockEmployeeCompany(tx: TransactionClient, company: string) {
  await tx.query(
    'INSERT INTO employees.company_guard(company_id) VALUES($1) ON CONFLICT DO NOTHING',
    [company],
  );
  await tx.query('SELECT company_id FROM employees.company_guard WHERE company_id=$1 FOR UPDATE', [
    company,
  ]);
}
export const employeeRowFields = (r: EmployeeRow): EmployeeFields => ({
  name: r.name,
  contact: r.contact,
  active: r.active,
  employmentStart: r.employment_start,
  employmentEnd: r.employment_end,
  branchId: r.branch_id,
  workDays: r.work_days,
  hoursPerDay: Number(r.hours_per_day),
  weeklyDayOff: r.weekly_day_off,
});
export async function readEmployeePolicies(
  tx: TransactionClient,
  company: string,
  id: string,
): Promise<PolicyRecord[]> {
  const rows = (
    await tx.query<{
      id: string;
      axis: 'salary' | 'commission';
      enabled: boolean;
      monthly_minor: string | null;
      formula: 'fixed' | 'percentage' | null;
      basis_points: number | null;
      per_visit_minor: string | null;
      effective_from: string;
      effective_to: string | null;
      superseded: boolean;
      reason: string;
      recorded_at: Date;
    }>(
      `SELECT p.*,p.effective_from::text,p.effective_to::text FROM employees.compensation_policy p WHERE company_id=$1 AND employee_id=$2 ORDER BY p.effective_from,p.recorded_at,p.id`,
      [company, id],
    )
  ).rows;
  return rows.map((r) => ({
    id: r.id,
    axis: r.axis,
    from: r.effective_from,
    to: r.effective_to,
    superseded: r.superseded,
    reason: r.reason,
    recordedAt: r.recorded_at.toISOString(),
    terms:
      r.axis === 'salary'
        ? ((r.enabled
            ? { enabled: true, monthly: { currency: 'EGP', amountMinor: r.monthly_minor! } }
            : { enabled: false, monthly: null }) as SalaryTerms)
        : ((!r.enabled
            ? { enabled: false, formula: null, basisPoints: null, perVisit: null }
            : r.formula === 'percentage'
              ? {
                  enabled: true,
                  formula: 'percentage',
                  basisPoints: r.basis_points!,
                  perVisit: null,
                }
              : {
                  enabled: true,
                  formula: 'fixed',
                  basisPoints: null,
                  perVisit: { currency: 'EGP', amountMinor: r.per_visit_minor! },
                }) as CommissionTerms),
  }));
}
export async function lockPayrollControl(
  tx: TransactionClient,
  company: string,
  employee: string,
  month: string,
) {
  await tx.query(
    `INSERT INTO employees.payroll_period(company_id,employee_id,month,state) VALUES($1,$2,$3,CASE WHEN $3::date<date_trunc('month',clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date THEN 'frozen_unpaid' ELSE 'editable_unpaid' END) ON CONFLICT DO NOTHING`,
    [company, employee, month + '-01'],
  );
  return (
    await tx.query<{ state: PayrollState; version: number }>(
      'SELECT state,version FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month=$3 FOR UPDATE',
      [company, employee, month + '-01'],
    )
  ).rows[0]!;
}
export async function employeeClock(tx: TransactionClient) {
  return (
    await tx.query<{ now: Date; today: string; month: string }>(
      `WITH t AS MATERIALIZED (SELECT clock_timestamp() AS at) SELECT at AS now,(at AT TIME ZONE 'Africa/Cairo')::date::text AS today,to_char(at AT TIME ZONE 'Africa/Cairo','YYYY-MM') AS month FROM t`,
    )
  ).rows[0]!;
}
