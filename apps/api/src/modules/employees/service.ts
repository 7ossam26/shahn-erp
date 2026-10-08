import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  EmployeeCommand,
  EmployeeDetail,
  EmployeeFields,
  EmployeeTerms,
  EmployeeFilter,
  EmployeeList,
  EmployeeRecord,
  EmployeeCatalog,
  EmployeeResult,
  TermChange,
  TermsPreview,
  SalaryTerms,
  CommissionTerms,
  EmployeeMoney,
  LinkRecord,
} from '@shahn/contracts';
import { employeeExamples, validateEmployeeCommand } from '@shahn/contracts';
import {
  AccessError,
  validateEmployeeProfile,
  validateCompensation,
  resolveEffective,
  resolvePolicy,
  cairoWorkDate,
  payrollEditReason,
  commissionPerVisit,
  minor,
} from '@shahn/domain';
import {
  readEmployee,
  readEmployeePolicies,
  employeeRowFields,
  lockEmployeeCompany,
  lockPayrollControl,
  employeeClock,
  type TransactionClient,
  type EmployeeRow,
} from '@shahn/database';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { materializePayroll } from './payroll-period.service.js';
const disabled = employeeExamples.off;
async function lock(uow: UnitOfWork) {
  uow.lockOrder('employee', '0:company:' + uow.access.companyId);
  await lockEmployeeCompany(uow.client, uow.access.companyId);
}
async function authorizedEmployee(uow: UnitOfWork, id: string, locked = false) {
  const r = await readEmployee(uow.client, uow.access.companyId, id, locked);
  if (!r) throw new AccessError('NOT_FOUND', 404);
  uow.assertBranch(r.branch_id);
  return r;
}
async function validBranch(uow: UnitOfWork, id: string) {
  uow.assertBranch(id);
  const r = (
    await uow.client.query<{ name: string }>(
      'SELECT name FROM access.branch WHERE company_id=$1 AND id=$2 AND active',
      [uow.access.companyId, id],
    )
  ).rows[0];
  if (!r) throw new AccessError('INVALID_EMPLOYEE_BRANCH', 409);
  return r.name;
}
/** P20 must call this inside its transaction, before freeze/payout snapshot, using this same row. */
export async function guardEditablePayrollPeriod(
  tx: TransactionClient,
  companyId: string,
  employeeId: string,
  month: string,
) {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new AccessError('INVALID_PAYROLL_MONTH', 400);
  const control = await lockPayrollControl(tx, companyId, employeeId, month);
  // Check after materializing and acquiring the row; the Cairo boundary can pass while waiting.
  const now = await employeeClock(tx);
  if (month < now.month) await materializePayroll(tx, companyId, employeeId, month);
  const reason = payrollEditReason(month, control.state, now.now);
  if (reason) throw new AccessError(reason, 409);
  return { ...control, month, currentMonth: now.month };
}
async function termsAt(
  tx: TransactionClient,
  company: string,
  employee: string,
  date: string,
): Promise<EmployeeTerms> {
  const rows = await readEmployeePolicies(tx, company, employee),
    salary = resolvePolicy(rows, 'salary', date.slice(0, 7) + '-01'),
    commission = resolvePolicy(rows, 'commission', date);
  return {
    salary: salary.status === 'resolved' ? (salary.value.terms as SalaryTerms) : disabled.salary,
    commission:
      commission.status === 'resolved'
        ? (commission.value.terms as CommissionTerms)
        : disabled.commission,
  };
}
async function links(
  tx: TransactionClient,
  company: string,
  employee: string,
): Promise<LinkRecord[]> {
  return (
    await tx.query<LinkRecord>(
      `SELECT l.id,l.driver_id AS "driverId",l.effective_from::text AS "from",l.effective_to::text AS "to",l.driver_name AS "driverName",d.external_mapping AS "externalMapping" FROM employees.employee_driver_link l JOIN employees.operational_driver d ON (d.company_id,d.id)=(l.company_id,l.driver_id) WHERE l.company_id=$1 AND l.employee_id=$2 AND NOT l.superseded ORDER BY l.effective_from,l.id`,
      [company, employee],
    )
  ).rows;
}
async function record(uow: UnitOfWork, r: EmployeeRow, date: string): Promise<EmployeeRecord> {
  const branch = (
    await uow.client.query<{ branch_id: string; branch_name: string }>(
      `SELECT branch_id,branch_name FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT superseded AND effective_from<=$3 AND (effective_to IS NULL OR $3<effective_to)`,
      [uow.access.companyId, r.id, date],
    )
  ).rows[0];
  if (branch) uow.assertBranch(branch.branch_id);
  const ls = await links(uow.client, uow.access.companyId, r.id),
    l = resolveEffective(ls, date);
  return {
    id: r.id,
    reference: r.reference,
    version: r.version,
    fields: employeeRowFields(r),
    terms: await termsAt(uow.client, uow.access.companyId, r.id, date),
    association:
      l.status === 'unresolved'
        ? 'none'
        : l.value.externalMapping === 'pending'
          ? 'pending_external_mapping'
          : 'mapped',
    currentBranchName: branch?.branch_name ?? '',
  };
}
export async function employeeDetail(uow: UnitOfWork, id: string): Promise<EmployeeDetail> {
  const r = await authorizedEmployee(uow, id),
    clock = await employeeClock(uow.client);
  const historicalScope = await uow.client.query<{ branch_id: string }>(
    'SELECT DISTINCT branch_id FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2',
    [uow.access.companyId, id],
  );
  for (const b of historicalScope.rows) uow.assertBranch(b.branch_id);
  const policies = await readEmployeePolicies(uow.client, uow.access.companyId, id);
  const branches = (
    await uow.client.query<EmployeeDetail['branches'][number]>(
      `SELECT id,branch_id AS "branchId",branch_name AS "branchName",effective_from::text AS "from",effective_to::text AS "to",reason FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT superseded ORDER BY effective_from,id`,
      [uow.access.companyId, id],
    )
  ).rows;
  // History can expose finance of a previous branch: require each affected branch.
  for (const b of branches) uow.assertBranch(b.branchId);
  const revisions = (
    await uow.client.query<EmployeeDetail['revisions'][number] & { at: Date }>(
      `SELECT version,fields,reason,recorded_at AS at,actor_name AS actor FROM employees.profile_revision WHERE company_id=$1 AND employee_id=$2 ORDER BY version DESC`,
      [uow.access.companyId, id],
    )
  ).rows.map((r) => ({ ...r, at: r.at.toISOString() }));
  const periods = (
    await uow.client.query<EmployeeDetail['periods'][number]>(
      `SELECT to_char(month,'YYYY-MM') AS month,state,version FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 ORDER BY month`,
      [uow.access.companyId, id],
    )
  ).rows;
  const earliest =
    r.last_accepted_work_date && r.last_accepted_work_date >= clock.today
      ? nextDate(r.last_accepted_work_date)
      : clock.today;
  return {
    ...(await record(uow, r, clock.today)),
    policies,
    branches,
    links: await links(uow.client, uow.access.companyId, id),
    revisions,
    periods,
    boundaries: {
      currentMonth: clock.month,
      earliestCommissionDate: earliest,
      salaryExplanation:
        'Current editable unpaid full month or a future month only; past unpaid, paid and closed periods are protected. No proration.',
    },
  };
}
const normalize = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632))).toLowerCase();
export async function employeeList(uow: UnitOfWork, f: EmployeeFilter): Promise<EmployeeList> {
  if (f.branchId) uow.assertBranch(f.branchId);
  const clock = await employeeClock(uow.client),
    date = f.effectiveDate ?? clock.today;
  const scope = uow.access.assignedBranches.map((b) => b.id);
  const rows = (
    await uow.client.query<{ id: string }>(
      `SELECT e.id FROM employees.employee e WHERE e.company_id=$1 AND e.branch_id=ANY($2::uuid[]) AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM employees.employee_branch_history b WHERE b.company_id=e.company_id AND b.employee_id=e.id AND NOT b.superseded AND b.branch_id=$3 AND b.effective_from<=$4 AND (b.effective_to IS NULL OR $4<b.effective_to))) AND ($5='all' OR e.active::text=$5) ORDER BY e.name,e.id`,
      [uow.access.companyId, scope, f.branchId, date, f.active],
    )
  ).rows;
  const matched: EmployeeRecord[] = [];
  for (const row of rows) {
    // Scope applies to the whole profile/history, not tracking's company-wide exception.
    const outside = await uow.client.query(
      `SELECT 1 FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT branch_id=ANY($3::uuid[]) LIMIT 1`,
      [uow.access.companyId, row.id, scope],
    );
    if (outside.rowCount) continue;
    const r = await record(
        uow,
        (await readEmployee(uow.client, uow.access.companyId, row.id))!,
        date,
      ),
      s = r.terms.salary,
      c = r.terms.commission;
    if (f.search && !normalize(r.fields.name + ' ' + r.reference).includes(normalize(f.search)))
      continue;
    if (f.salary !== 'all' && s.enabled !== (f.salary === 'enabled')) continue;
    if (
      f.commission !== 'all' &&
      (f.commission === 'disabled' ? c.enabled : !c.enabled || c.formula !== f.commission)
    )
      continue;
    if (
      (f.payrollState && f.payrollState !== 'all') ||
      (f.carry && f.carry !== 'all') ||
      (f.advanceStatus && f.advanceStatus !== 'all')
    ) {
      const hidden = await uow.client.query(
        'SELECT 1 FROM employees.payroll_obligation WHERE company_id=$1 AND employee_id=$2 AND NOT branch_id=ANY($3::uuid[]) LIMIT 1',
        [uow.access.companyId, row.id, scope],
      );
      if (hidden.rowCount) continue;
      const pm = (f.payrollMonth ?? clock.month) + '-01';
      const status = (
        await uow.client.query<{
          state: string;
          carry: boolean;
          outstanding: boolean;
          recovered: boolean;
        }>(
          `SELECT COALESCE((SELECT state FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month=$3),'editable_unpaid') AS state,
      EXISTS(SELECT 1 FROM employees.obligation_balance WHERE company_id=$1 AND employee_id=$2 AND month<$3 AND available_for_new_allocation>0) AS carry,
      EXISTS(SELECT 1 FROM employees.obligation_balance WHERE company_id=$1 AND employee_id=$2 AND kind='advance' AND month<=$3 AND outstanding_amount>0) AS outstanding,
      EXISTS(SELECT 1 FROM employees.obligation_balance WHERE company_id=$1 AND employee_id=$2 AND kind='advance' AND month<=$3 AND outstanding_amount=0) AS recovered`,
          [uow.access.companyId, row.id, pm],
        )
      ).rows[0]!;
      if (
        f.payrollState &&
        f.payrollState !== 'all' &&
        (f.payrollState === 'unpaid'
          ? !['editable_unpaid', 'frozen_unpaid'].includes(status.state)
          : status.state !== f.payrollState)
      )
        continue;
      if (f.carry && f.carry !== 'all' && status.carry !== (f.carry === 'yes')) continue;
      if (f.advanceStatus && f.advanceStatus !== 'all' && !status[f.advanceStatus]) continue;
    }
    matched.push(r);
  }
  return {
    items: matched.slice((f.page - 1) * f.limit, f.page * f.limit),
    total: matched.length,
    page: f.page,
    limit: f.limit,
  };
}
export async function employeeCatalog(uow: UnitOfWork): Promise<EmployeeCatalog> {
  const clock = await employeeClock(uow.client),
    scope = uow.access.assignedBranches.map((b) => b.id);
  const branches = (
    await uow.client.query<{ id: string; name: string }>(
      'SELECT id,name FROM access.branch WHERE company_id=$1 AND id=ANY($2::uuid[]) AND active ORDER BY name,id',
      [uow.access.companyId, scope],
    )
  ).rows;
  const drivers = (
    await uow.client.query<EmployeeCatalog['drivers'][number]>(
      `SELECT id,name,branch_id AS "branchId",active,external_mapping AS "externalMapping" FROM employees.operational_driver WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name,id`,
      [uow.access.companyId, scope],
    )
  ).rows;
  return {
    companyId: uow.access.companyId,
    branches,
    drivers,
    currentMonth: clock.month,
    today: clock.today,
  };
}
function nextDate(date: string) {
  return new Date(Date.parse(date + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
}
async function guardWorkDate(uow: UnitOfWork, r: EmployeeRow, date: string, driverId?: string) {
  const clock = await employeeClock(uow.client);
  if (date < clock.today || date < r.employment_start)
    throw new AccessError('WORK_DATE_PROTECTED', 409);
  if (r.last_accepted_work_date && date <= r.last_accepted_work_date)
    throw new AccessError('ACCEPTED_WORK_PROTECTED', 409);
  if (driverId) {
    const d = (
      await uow.client.query<{ last_accepted_work_date: string | null }>(
        `SELECT last_accepted_work_date::text FROM employees.operational_driver WHERE company_id=$1 AND id=$2 FOR UPDATE`,
        [uow.access.companyId, driverId],
      )
    ).rows[0];
    if (d?.last_accepted_work_date && date <= d.last_accepted_work_date)
      throw new AccessError('ACCEPTED_WORK_PROTECTED', 409);
  }
}
async function validateChange(
  uow: UnitOfWork,
  r: EmployeeRow,
  change: TermChange,
  materialize: boolean,
) {
  if (!change.salary && !change.commission) throw new AccessError('EMPTY_TERM_CHANGE', 400);
  const current = await employeeClock(uow.client),
    before = await termsAt(uow.client, uow.access.companyId, r.id, current.today);
  validateCompensation({
    salary: change.salary?.terms ?? before.salary,
    commission: change.commission?.terms ?? before.commission,
  });
  if (change.salary) {
    if (materialize)
      await guardEditablePayrollPeriod(uow.client, uow.access.companyId, r.id, change.salary.month);
    else {
      const period = (
        await uow.client.query<{ state: EmployeeDetail['periods'][number]['state'] }>(
          'SELECT state FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month=$3',
          [uow.access.companyId, r.id, change.salary.month + '-01'],
        )
      ).rows[0];
      const reason = payrollEditReason(change.salary.month, period?.state ?? null, current.now);
      if (reason) throw new AccessError(reason, 409);
    }
  }
  if (change.commission) await guardWorkDate(uow, r, change.commission.effectiveDate);
  return before;
}
export async function termPreview(
  uow: UnitOfWork,
  id: string,
  expectedVersion: number,
  change: TermChange,
  base: EmployeeMoney,
  packingUplift: EmployeeMoney,
): Promise<TermsPreview> {
  await lock(uow);
  const r = await authorizedEmployee(uow, id, true);
  if (r.version !== expectedVersion) throw new AccessError('REVISION_CONFLICT', 409, r.version);
  minor(base.amountMinor, 'nonnegative');
  minor(packingUplift.amountMinor, 'nonnegative');
  const clock = await employeeClock(uow.client),
    before = await termsAt(uow.client, uow.access.companyId, id, clock.today);
  const after = {
    salary: change.salary?.terms ?? before.salary,
    commission: change.commission?.terms ?? before.commission,
  };
  validateCompensation(after);
  let protectedReason: string | null = null;
  try {
    await validateChange(uow, r, change, false);
  } catch (e) {
    if (!(e instanceof AccessError) || e.status !== 409) throw e;
    protectedReason = e.code;
  }
  return {
    employeeId: id,
    version: r.version,
    before,
    after,
    salaryMonth: change.salary?.month ?? null,
    commissionDate: change.commission?.effectiveDate ?? null,
    allowed: protectedReason === null,
    protectedReason,
    base,
    packingUplift,
    commission: {
      currency: 'EGP',
      amountMinor: commissionPerVisit(base.amountMinor, after.commission),
    },
    effects: [
      'Salary replaces the configured full month; schedule fields do not create attendance or proration.',
      'Commission applies per eligible actual visit from the chosen work date. Packing uplift, brand payment and shipping waiver do not affect it.',
      'Earlier accepted earnings, past/paid periods and historical branch/name snapshots remain preserved.',
    ],
  };
}
async function insertPolicy(
  uow: UnitOfWork,
  id: string,
  axis: 'salary' | 'commission',
  from: string,
  terms: SalaryTerms | CommissionTerms,
  reason: string,
) {
  const rows = (
    await uow.client.query<{ id: string; from: string; to: string | null }>(
      `SELECT id,effective_from::text AS "from",effective_to::text AS "to" FROM employees.compensation_policy WHERE company_id=$1 AND employee_id=$2 AND axis=$3 AND NOT superseded ORDER BY effective_from FOR UPDATE`,
      [uow.access.companyId, id, axis],
    )
  ).rows;
  const active = rows.find((r) => r.from <= from && (!r.to || from < r.to));
  const end = active?.to ?? rows.find((r) => r.from > from)?.from ?? null;
  if (active)
    await uow.client.query(
      active.from === from
        ? 'UPDATE employees.compensation_policy SET superseded=true WHERE company_id=$1 AND id=$2'
        : 'UPDATE employees.compensation_policy SET effective_to=$3 WHERE company_id=$1 AND id=$2',
      [uow.access.companyId, active.id, ...(active.from === from ? [] : [from])],
    );
  const salary = axis === 'salary' ? (terms as SalaryTerms) : null,
    c = axis === 'commission' ? (terms as CommissionTerms) : null;
  await uow.client.query(
    `INSERT INTO employees.compensation_policy(company_id,employee_id,id,axis,enabled,monthly_minor,formula,basis_points,per_visit_minor,effective_from,effective_to,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      uow.access.companyId,
      id,
      randomUUID(),
      axis,
      terms.enabled,
      salary?.enabled ? salary.monthly.amountMinor : null,
      c?.enabled ? c.formula : null,
      c?.enabled && c.formula === 'percentage' ? c.basisPoints : null,
      c?.enabled && c.formula === 'fixed' ? c.perVisit.amountMinor : null,
      from,
      end,
      reason,
    ],
  );
}
async function revision(
  uow: UnitOfWork,
  id: string,
  version: number,
  fields: EmployeeFields,
  reason: string,
) {
  await uow.client.query(
    'INSERT INTO employees.profile_revision(company_id,employee_id,version,fields,reason,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [
      uow.access.companyId,
      id,
      version,
      JSON.stringify(fields),
      reason,
      uow.access.principalId,
      uow.access.principalKind === 'support' ? 'Technical Support' : uow.access.displayName,
    ],
  );
}
async function writeProfile(uow: UnitOfWork, id: string, fields: EmployeeFields, version: number) {
  await uow.client.query(
    `UPDATE employees.employee SET name=$3,contact=$4,active=$5,employment_start=$6,employment_end=$7,branch_id=$8,work_days=$9,hours_per_day=$10,weekly_day_off=$11,version=$12 WHERE company_id=$1 AND id=$2`,
    [
      uow.access.companyId,
      id,
      fields.name,
      fields.contact,
      fields.active,
      fields.employmentStart,
      fields.employmentEnd,
      fields.branchId,
      fields.workDays,
      fields.hoursPerDay,
      fields.weeklyDayOff,
      version,
    ],
  );
}
async function branchRevision(
  uow: UnitOfWork,
  id: string,
  branchId: string,
  from: string,
  reason: string,
) {
  const name = await validBranch(uow, branchId);
  const rows = (
    await uow.client.query<{ id: string; from: string; to: string | null }>(
      `SELECT id,effective_from::text AS "from",effective_to::text AS "to" FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT superseded ORDER BY effective_from`,
      [uow.access.companyId, id],
    )
  ).rows;
  const hit = rows.find((r) => r.from <= from && (!r.to || from < r.to)),
    end = hit?.to ?? rows.find((r) => r.from > from)?.from ?? null;
  if (hit)
    await uow.client.query(
      hit.from === from
        ? 'UPDATE employees.employee_branch_history SET superseded=true WHERE company_id=$1 AND id=$2'
        : 'UPDATE employees.employee_branch_history SET effective_to=$3 WHERE company_id=$1 AND id=$2',
      [uow.access.companyId, hit.id, ...(hit.from === from ? [] : [from])],
    );
  await uow.client.query(
    'INSERT INTO employees.employee_branch_history(company_id,employee_id,id,branch_id,branch_name,effective_from,effective_to,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [uow.access.companyId, id, randomUUID(), branchId, name, from, end, reason],
  );
}
export function employeeCommands(
  pool: Pool,
  hooks: { beforeTermsWrite?: () => Promise<void>; afterMutation?: () => Promise<void> } = {},
) {
  const kinds: EmployeeCommand['type'][] = [
    'employee.create',
    'employee.update',
    'employee.deactivate',
    'employee.terms',
    'employee.link',
  ];
  const definitions: CommandDefinition<EmployeeCommand>[] = kinds.map((kind) => ({
    kind,
    family: 'employees.profile',
    capability: 'employees',
    prepareProtectedHistory: async (uow, input) => {
      if (
        validateEmployeeCommand(input) &&
        input.type === 'employee.terms' &&
        input.change.salary
      ) {
        await lock(uow);
        const clock = await employeeClock(uow.client);
        if (input.change.salary.month < clock.month) {
          await materializePayroll(
            uow.client,
            uow.access.companyId,
            input.employeeId,
            input.change.salary.month,
          );
        }
      }
    },
    authorize: async (uow, value, recovery) => {
      if ('branchId' in value && typeof value.branchId === 'string')
        uow.assertBranch(value.branchId);
      if ('fields' in value) uow.assertBranch((value.fields as EmployeeFields).branchId);
      if ('employeeId' in value && typeof value.employeeId === 'string') {
        const r = await readEmployee(uow.client, uow.access.companyId, value.employeeId);
        if (r) {
          uow.assertBranch(r.branch_id);
          const history = await uow.client.query<{ branch_id: string }>(
            'SELECT DISTINCT branch_id FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2',
            [uow.access.companyId, r.id],
          );
          for (const b of history.rows) uow.assertBranch(b.branch_id);
        } else if (!recovery) throw new AccessError('NOT_FOUND', 404);
      }
      if ('localDriver' in value && value.localDriver)
        uow.assertBranch((value.localDriver as { branchId: string }).branchId);
    },
    rejectionReference: async (input, uow) => ({
      entityId: 'employeeId' in input ? input.employeeId : input.commandId,
      branchId:
        'fields' in input
          ? input.fields.branchId
          : (await authorizedEmployee(uow, input.employeeId)).branch_id,
    }),
    resolve: async (uow, ref) => {
      const r = (
        await uow.client.query<{ result: EmployeeResult }>(
          'SELECT result FROM employees.command_outcome WHERE company_id=$1 AND command_record_id=$2',
          [uow.access.companyId, ref.recordId],
        )
      ).rows[0];
      if (!r) throw new AccessError('NOT_FOUND', 404);
      return r.result;
    },
    execute: async (uow, input, recordId) => {
      if (!validateEmployeeCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      await lock(uow);
      const clock = await employeeClock(uow.client);
      let id: string,
        fields: EmployeeFields,
        version: number,
        beforeVersion: number | null,
        reference: string;
      if (input.type === 'employee.create') {
        validateEmployeeProfile(input.fields);
        validateCompensation(input.terms);
        await validBranch(uow, input.fields.branchId);
        id = randomUUID();
        fields = input.fields;
        version = 1;
        beforeVersion = null;
        await uow.client.query(
          "INSERT INTO kernel.resource(company_id,id,family) VALUES($1,$2,'employee')",
          [uow.access.companyId, id],
        );
        reference = (
          await uow.client.query<{ reference: string }>(
            `INSERT INTO employees.employee(company_id,id,name,contact,active,employment_start,employment_end,branch_id,work_days,hours_per_day,weekly_day_off,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1) RETURNING reference`,
            [
              uow.access.companyId,
              id,
              fields.name,
              fields.contact,
              fields.active,
              fields.employmentStart,
              fields.employmentEnd,
              fields.branchId,
              fields.workDays,
              fields.hoursPerDay,
              fields.weeklyDayOff,
            ],
          )
        ).rows[0]!.reference;
        await branchRevision(
          uow,
          id,
          fields.branchId,
          fields.employmentStart,
          'Initial employee setup',
        );
        const salaryMonth =
          fields.employmentStart.slice(0, 7) > clock.month
            ? fields.employmentStart.slice(0, 7)
            : clock.month;
        await guardEditablePayrollPeriod(uow.client, uow.access.companyId, id, salaryMonth);
        await insertPolicy(
          uow,
          id,
          'salary',
          salaryMonth + '-01',
          input.terms.salary,
          'Initial employee setup',
        );
        await insertPolicy(
          uow,
          id,
          'commission',
          fields.employmentStart > clock.today ? fields.employmentStart : clock.today,
          input.terms.commission,
          'Initial employee setup',
        );
        await revision(uow, id, version, fields, 'Initial employee setup');
      } else {
        id = input.employeeId;
        const r = await authorizedEmployee(uow, id, true);
        beforeVersion = r.version;
        reference = r.reference;
        version = r.version + 1;
        fields = employeeRowFields(r);
        if (input.expectedVersion !== r.version)
          throw new AccessError('REVISION_CONFLICT', 409, r.version);
        if (!r.active && input.type !== 'employee.update' && input.type !== 'employee.deactivate')
          throw new AccessError('EMPLOYEE_INACTIVE', 409);
        if (input.type === 'employee.terms') {
          await validateChange(uow, r, input.change, true);
          await hooks.beforeTermsWrite?.();
          // Recheck after locks/barriers, including a possible Cairo month rollover.
          await validateChange(uow, r, input.change, true);
          if (input.change.salary)
            await insertPolicy(
              uow,
              id,
              'salary',
              input.change.salary.month + '-01',
              input.change.salary.terms,
              input.change.reason,
            );
          if (input.change.commission)
            await insertPolicy(
              uow,
              id,
              'commission',
              input.change.commission.effectiveDate,
              input.change.commission.terms,
              input.change.reason,
            );
        } else if (input.type === 'employee.update') {
          validateEmployeeProfile(input.fields);
          await validBranch(uow, input.fields.branchId);
          if (input.fields.branchId !== r.branch_id) {
            if (!input.branchEffectiveDate || input.branchEffectiveDate > clock.today)
              throw new AccessError('INVALID_BRANCH_EFFECTIVE_DATE', 409);
            await guardWorkDate(uow, r, input.branchEffectiveDate);
            await branchRevision(
              uow,
              id,
              input.fields.branchId,
              input.branchEffectiveDate,
              input.reason,
            );
          } else if (input.branchEffectiveDate !== null)
            throw new AccessError('INVALID_BRANCH_EFFECTIVE_DATE', 400);
          fields = input.fields;
        } else if (input.type === 'employee.deactivate') fields = { ...fields, active: false };
        else {
          if (
            (input.driverId === null) === (input.localDriver === null) ||
            (input.endDate && input.endDate <= input.effectiveDate)
          )
            throw new AccessError('INVALID_DRIVER_LINK', 400);
          let driverId = input.driverId;
          if (input.localDriver) {
            await validBranch(uow, input.localDriver.branchId);
            driverId = randomUUID();
            await uow.client.query(
              `INSERT INTO employees.operational_driver(company_id,id,name,branch_id) VALUES($1,$2,$3,$4)`,
              [uow.access.companyId, driverId, input.localDriver.name, input.localDriver.branchId],
            );
          }
          const driver = (
            await uow.client.query<{ name: string; branch_id: string; active: boolean }>(
              `SELECT name,branch_id,active FROM employees.operational_driver WHERE company_id=$1 AND id=$2 FOR UPDATE`,
              [uow.access.companyId, driverId],
            )
          ).rows[0];
          if (!driver || !driver.active) throw new AccessError('DRIVER_UNAVAILABLE', 409);
          uow.assertBranch(driver.branch_id);
          await guardWorkDate(uow, r, input.effectiveDate, driverId!);
          const conflicts = await uow.client.query(
            `SELECT 1 FROM employees.employee_driver_link WHERE company_id=$1 AND driver_id=$3 AND employee_id<>$2 AND NOT superseded AND daterange(effective_from,effective_to,'[)') && daterange($4::date,$5::date,'[)')`,
            [uow.access.companyId, id, driverId, input.effectiveDate, input.endDate],
          );
          if (conflicts.rowCount) throw new AccessError('DRIVER_LINK_OVERLAP', 409);
          const existing = (
            await uow.client.query<{ id: string; from: string }>(
              `SELECT id,effective_from::text AS "from" FROM employees.employee_driver_link WHERE company_id=$1 AND employee_id=$2 AND NOT superseded AND daterange(effective_from,effective_to,'[)') && daterange($3::date,$4::date,'[)')`,
              [uow.access.companyId, id, input.effectiveDate, input.endDate],
            )
          ).rows;
          // A future scheduled link cannot be silently erased by a new earlier link.
          if (existing.some((l) => l.from > input.effectiveDate))
            throw new AccessError('DRIVER_LINK_OVERLAP', 409);
          for (const l of existing)
            await uow.client.query(
              l.from === input.effectiveDate
                ? 'UPDATE employees.employee_driver_link SET superseded=true WHERE company_id=$1 AND id=$2'
                : 'UPDATE employees.employee_driver_link SET effective_to=$3 WHERE company_id=$1 AND id=$2',
              [
                uow.access.companyId,
                l.id,
                ...(l.from === input.effectiveDate ? [] : [input.effectiveDate]),
              ],
            );
          await uow.client.query(
            `INSERT INTO employees.employee_driver_link(company_id,id,employee_id,driver_id,effective_from,effective_to,driver_name,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              uow.access.companyId,
              randomUUID(),
              id,
              driverId,
              input.effectiveDate,
              input.endDate,
              driver.name,
              input.reason,
            ],
          );
        }
        await writeProfile(uow, id, fields, version);
        await revision(
          uow,
          id,
          version,
          fields,
          input.type === 'employee.terms' ? input.change.reason : input.reason,
        );
      }
      await hooks.afterMutation?.();
      const result: EmployeeResult = {
        commandId: input.commandId,
        employeeId: id,
        reference,
        version,
        branchId: fields.branchId,
      };
      await uow.client.query(
        'INSERT INTO employees.command_outcome(company_id,command_record_id,result) VALUES($1,$2,$3)',
        [uow.access.companyId, recordId, JSON.stringify(result)],
      );
      return {
        reply: { status: 200, body: result },
        reference: { recordId, employeeId: id, branchId: fields.branchId },
        entityId: id,
        beforeVersion,
        afterVersion: version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
export type EmployeeTermsResolution =
  | {
      status: 'unresolved';
      reason:
        | 'missing_driver'
        | 'external_mapping_pending'
        | 'missing_association'
        | 'overlapping_association'
        | 'missing_policy'
        | 'overlapping_policy'
        | 'missing_branch'
        | 'overlapping_branch'
        | 'missing_profile'
        | 'employee_inactive_at_work';
    }
  | {
      status: 'resolved';
      employeeId: string;
      employeeName: string;
      employeeProfileVersion: number;
      driverId: string;
      linkId: string;
      commissionPolicyId: string;
      commission: CommissionTerms;
      employeeBranchId: string;
      employeeBranchName: string;
      branchHistoryId: string;
      workDate: string;
    };
/** P13 joins its existing transaction. Locks serialize accepted-work watermark against edits. */
export async function resolveEmployeeTermsAt(
  tx: TransactionClient,
  companyId: string,
  driverId: string,
  workAt: Date,
  options: { acceptWork?: boolean } = {},
): Promise<EmployeeTermsResolution> {
  await lockEmployeeCompany(tx, companyId);
  const date = cairoWorkDate(workAt),
    d = (
      await tx.query<{ external_mapping: string }>(
        'SELECT external_mapping FROM employees.operational_driver WHERE company_id=$1 AND id=$2 FOR UPDATE',
        [companyId, driverId],
      )
    ).rows[0];
  if (!d) return { status: 'unresolved', reason: 'missing_driver' };
  if (d.external_mapping !== 'mapped')
    return { status: 'unresolved', reason: 'external_mapping_pending' };
  const rows = (
      await tx.query<{ id: string; employee_id: string; from: string; to: string | null }>(
        `SELECT id,employee_id,effective_from::text AS "from",effective_to::text AS "to" FROM employees.employee_driver_link WHERE company_id=$1 AND driver_id=$2 AND NOT superseded`,
        [companyId, driverId],
      )
    ).rows,
    l = resolveEffective(rows, date);
  if (l.status === 'unresolved')
    return {
      status: 'unresolved',
      reason: l.reason === 'missing' ? 'missing_association' : 'overlapping_association',
    };
  await readEmployee(tx, companyId, l.value.employee_id, true);
  const p = resolvePolicy(
    await readEmployeePolicies(tx, companyId, l.value.employee_id),
    'commission',
    date,
  );
  if (p.status === 'unresolved')
    return {
      status: 'unresolved',
      reason: p.reason === 'missing' ? 'missing_policy' : 'overlapping_policy',
    };
  const branch = resolveEffective(
    (
      await tx.query<{
        id: string;
        branch_id: string;
        branch_name: string;
        from: string;
        to: string | null;
      }>(
        `SELECT id,branch_id,branch_name,effective_from::text AS "from",effective_to::text AS "to" FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT superseded`,
        [companyId, l.value.employee_id],
      )
    ).rows,
    date,
  );
  if (branch.status === 'unresolved')
    return {
      status: 'unresolved',
      reason: branch.reason === 'missing' ? 'missing_branch' : 'overlapping_branch',
    };
  const historical = (
    await tx.query<{ fields: EmployeeFields; version: number }>(
      `SELECT fields,version FROM employees.profile_revision WHERE company_id=$1 AND employee_id=$2 AND recorded_at<=$3 ORDER BY version DESC LIMIT 1`,
      [companyId, l.value.employee_id, workAt],
    )
  ).rows[0];
  if (!historical) return { status: 'unresolved', reason: 'missing_profile' };
  if (
    !historical.fields.active ||
    date < historical.fields.employmentStart ||
    (historical.fields.employmentEnd && date > historical.fields.employmentEnd)
  )
    return { status: 'unresolved', reason: 'employee_inactive_at_work' };
  if (options.acceptWork) {
    await tx.query(
      'UPDATE employees.employee SET last_accepted_work_date=GREATEST(last_accepted_work_date,$3::date) WHERE company_id=$1 AND id=$2',
      [companyId, l.value.employee_id, date],
    );
    await tx.query(
      'UPDATE employees.operational_driver SET last_accepted_work_date=GREATEST(last_accepted_work_date,$3::date) WHERE company_id=$1 AND id=$2',
      [companyId, driverId, date],
    );
  }
  return {
    status: 'resolved',
    employeeId: l.value.employee_id,
    employeeName: historical.fields.name,
    employeeProfileVersion: historical.version,
    driverId,
    linkId: l.value.id,
    commissionPolicyId: p.value.id,
    commission: p.value.terms as CommissionTerms,
    employeeBranchId: branch.value.branch_id,
    employeeBranchName: branch.value.branch_name,
    branchHistoryId: branch.value.id,
    workDate: date,
  };
}
