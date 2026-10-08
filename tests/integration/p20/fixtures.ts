import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  EmployeeResult,
  PayrollCommand,
  PayrollMonth,
  PayrollFunding,
  FinanceResult,
} from '@shahn/contracts';
import { employeeExamples } from '@shahn/contracts';
import { cairoWorkDate } from '@shahn/domain';
import { accessFixture, fixtureConfig } from '../../support/access.js';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import {
  payrollCommands,
  payrollMonth,
  type PayrollHooks,
} from '../../../apps/api/src/modules/employees/payroll.service.js';
import { controlledPayrollClock } from '../../../apps/api/src/modules/employees/payroll-period.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
export const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { resolve, promise };
};
/** Observe a real independent backend waiting on a lock; a delay is not race evidence. */
export async function waitForBlocked(pool: Pool) {
  for (let n = 0; n < 100; n++) {
    if (
      (
        await pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0 LIMIT 1",
        )
      ).rowCount
    )
      return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error('Expected independent PostgreSQL lock waiter');
}
export const offsetMonth = (month: string, n: number) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1))
    .toISOString()
    .slice(0, 7);
export async function payrollFixture(
  pool: Pool,
  origin = 'http://127.0.0.1:5401',
  existing?: Awaited<ReturnType<typeof accessFixture>>,
) {
  const f = existing ?? (await accessFixture(pool, fixtureConfig(origin)));
  const now = { today: cairoWorkDate(new Date()) },
    clock = controlledPayrollClock(() => now.today),
    month = now.today.slice(0, 7);
  const money = financeCommands(pool),
    employees = employeeCommands(pool);
  const create = async (name = 'موظف الرواتب', salary = '600000') =>
    (
      await employees.execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'employee.create',
        fields: {
          name,
          contact: '01000000000',
          active: true,
          employmentStart: now.today,
          employmentEnd: null,
          branchId: f.a,
          workDays: [0, 1, 2, 3, 4],
          hoursPerDay: 8,
          weeklyDayOff: 5,
        },
        terms: {
          salary: { enabled: true, monthly: { currency: 'EGP', amountMinor: salary } },
          commission: employeeExamples.off.commission,
        },
      })
    ).body as EmployeeResult;
  const account = async (type: 'cash' | 'bank', branchIds = type === 'cash' ? [f.a] : [f.a, f.b]) =>
    (
      (
        await money.execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'account.create',
          fields: {
            name: type === 'cash' ? 'خزنة الرواتب التجريبية' : 'بنك الرواتب التجريبي',
            type,
            currency: 'EGP',
            branchIds,
            active: true,
            bankDescription: '',
          },
        })
      ).body as FinanceResult
    ).entityId;
  const cash = await account('cash'),
    bank = await account('bank');
  await money.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'movement.create',
    fields: {
      accountId: cash,
      branchId: f.a,
      currency: 'EGP',
      amountMinor: '100000000',
      actualDate: now.today,
      method: 'cash',
      direction: 'deposit',
      reason: 'أموال اختبار معزولة',
    },
  });
  const funding: PayrollFunding = {
    accountId: cash,
    branchId: f.a,
    method: 'cash',
    actualDate: now.today,
    reference: 'اختبار P20',
  };
  const read = (employee: string, m = month, token = f.admin.token) =>
    UnitOfWork.run(pool, token, f.company, 'employees', (u) => payrollMonth(u, employee, m, clock));
  const command = (p: PayrollMonth, extra: object): PayrollCommand =>
    ({
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      employeeId: p.employeeId,
      month: p.month,
      expectedVersion: p.version,
      expectedDigest: p.digest,
      ...extra,
    }) as PayrollCommand;
  const service = (hooks: PayrollHooks = {}) => payrollCommands(pool, hooks, clock);
  const issue = async (employee: string, amountMinor = '100000', m = month) =>
    service().execute(
      f.admin.token,
      command(await read(employee, m), { type: 'payroll.advance', amountMinor, funding }),
    );
  const adjustment = async (
    employee: string,
    amountMinor = '20000',
    kind = 'earning_deduction',
    m = month,
  ) =>
    service().execute(
      f.admin.token,
      command(await read(employee, m), {
        type: 'payroll.adjustment',
        kind,
        amountMinor,
        reason: 'خصم عادي محسوب يدويًا',
        workDate: m + '-15',
      }),
    );
  const pay = async (employee: string, m = month) =>
    service().execute(
      f.admin.token,
      command(await read(employee, m), { type: 'payroll.payout', funding }),
    );
  return {
    ...f,
    clock,
    now,
    month,
    cash,
    bank,
    funding,
    create,
    read,
    command,
    service,
    issue,
    adjustment,
    pay,
    employees,
  };
}
