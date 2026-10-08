import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, employeeClock } from '@shahn/database';
import { incidentFixture } from '../p18/fixtures.js';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import {
  payrollCommands,
  payrollMonth,
} from '../../../apps/api/src/modules/employees/payroll.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import type { PayrollCommand, PayrollMonth, FinanceResult, PayrollFunding } from '@shahn/contracts';
import { offsetMonth, deferred, waitForBlocked } from './fixtures.js';
import { controlledPayrollClock } from '../../../apps/api/src/modules/employees/payroll-period.service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof incidentFixture>>,
  month: string,
  funding: PayrollFunding;
let firstVisit: Awaited<ReturnType<Awaited<ReturnType<typeof incidentFixture>>['received']>>;
let firstOutcome: Awaited<ReturnType<typeof firstVisit.outcome>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await incidentFixture(db.pool);
  const clock = await employeeClock(db.pool);
  month = clock.month;
  const e = (
    await db.pool.query('SELECT version FROM employees.employee WHERE company_id=$1 AND id=$2', [
      f.company,
      f.employee.employeeId,
    ])
  ).rows[0];
  await employeeCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'employee.terms',
    employeeId: f.employee.employeeId,
    expectedVersion: e.version,
    change: {
      salary: {
        month,
        terms: { enabled: true, monthly: { currency: 'EGP', amountMinor: '600000' } },
      },
      commission: null,
      reason: 'Configured full salary',
    },
  });
  const money = financeCommands(db.pool);
  const a = (
    await money.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'account.create',
      fields: {
        name: 'Payroll source test cash',
        type: 'cash',
        currency: 'EGP',
        branchIds: [f.b],
        active: true,
        bankDescription: '',
      },
    })
  ).body as FinanceResult;
  await money.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'movement.create',
    fields: {
      accountId: a.entityId,
      branchId: f.b,
      currency: 'EGP',
      amountMinor: '10000000',
      actualDate: clock.today,
      method: 'cash',
      direction: 'deposit',
      reason: 'Isolated P20 funds',
    },
  });
  funding = {
    accountId: a.entityId,
    branchId: f.b,
    method: 'cash',
    actualDate: clock.today,
    reference: 'Cross-branch funding',
  };
});
afterAll(async () => {
  if (f)
    await writeFile(
      'docs/verification/P20/native-sources.json',
      JSON.stringify(
        {
          companyId: f.company,
          employeeId: f.employee.employeeId,
          workMonth: month,
          workBranch: f.a,
          incidentBranch: f.b,
          payingBranch: funding.branchId,
          visits: (
            await db.pool.query(
              'SELECT v.id,v.source_record_id,v.task_id,v.driver_id,v.branch_id,v.work_at,v.price,b.amount_minor,b.resolution FROM execution.visit_fact v JOIN execution.earning_basis b ON (b.company_id,b.visit_id)=(v.company_id,v.id) WHERE v.company_id=$1 ORDER BY v.id',
              [f.company],
            )
          ).rows,
          incidents: (
            await db.pool.query(
              'SELECT id,incident_id,employee_id,payroll_month,incident_branch_id,amount_minor,effect_id,source_id FROM employees.incident_obligation WHERE company_id=$1',
              [f.company],
            )
          ).rows,
          costSources: (
            await db.pool.query(
              'SELECT * FROM employees.payroll_cost_source WHERE company_id=$1 ORDER BY work_date,kind,source_id',
              [f.company],
            )
          ).rows,
        },
        null,
        2,
      ),
    );
  await db?.dispose();
});
const read = (m = month) =>
  UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', (u) =>
    payrollMonth(u, f.employee.employeeId, m),
  );
const cmd = (p: PayrollMonth, extra: object) =>
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
const drain = async () => {
  for (let n = 0; n < 12; n++) if (!(await f.worker.runOne())) break;
};
it('AC04/05 actual P13 visits 50+5 at 10%, replay, P18 original share 200, cross-branch payout and cost', async () => {
  const first = await f.received({ service: 'company_packed' }),
    arrival = first.arrival();
  await f.receive(arrival);
  await drain();
  firstVisit = first;
  firstOutcome = await first.outcome('full');
  await f.receive(f.event('outcome.recorded', { outcome: firstOutcome }, first.task.taskId, 2));
  await drain();
  await f.receive(arrival);
  await drain();
  const second = await f.received({ service: 'company_packed' });
  await f.receive(second.arrival());
  await drain();
  const p = await read();
  expect(p.calculation.commission).toBe('1000');
  expect(
    p.earnings
      .filter((e) => e.kind === 'commission')
      .every(
        (e) =>
          e.commissionBasis?.baseMinor === '5000' &&
          e.commissionBasis.terms.enabled &&
          e.commissionBasis.terms.formula === 'percentage' &&
          e.commissionBasis.terms.basisPoints === 1000,
      ),
  ).toBe(true);
  const tomorrow = new Date(Date.parse(funding.actualDate + 'T12:00:00Z') + 86400000)
    .toISOString()
    .slice(0, 10);
  const version = (
    await db.pool.query('SELECT version FROM employees.employee WHERE company_id=$1 AND id=$2', [
      f.company,
      f.employee.employeeId,
    ])
  ).rows[0].version;
  await employeeCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'employee.terms',
    employeeId: f.employee.employeeId,
    expectedVersion: version,
    change: {
      salary: null,
      commission: {
        effectiveDate: tomorrow,
        terms: { enabled: true, formula: 'percentage', basisPoints: 2000, perVisit: null },
      },
      reason: 'Future commission must not reprice actual prior work',
    },
  });
  expect((await read()).earnings).toEqual(p.earnings);
  expect(
    p.earnings.filter((e) => e.kind === 'commission').map((e) => [e.amountMinor, e.branchId]),
  ).toEqual([
    ['500', f.a],
    ['500', f.a],
  ]);
  const damaged = await f.shipment(),
    report = await f.report(damaged.s.shipmentId);
  await f.confirm(
    report.result.incidentId,
    f.confirmation({ responsibleBranchId: f.b, branchReason: 'Historical incident branch B' }),
  );
  const debt = await read();
  const onlyA = await f.make('payroll-work-branch-only', [f.a], f.adminRole);
  await expect(
    UnitOfWork.run(db.pool, onlyA.token, f.company, 'employees', (u) =>
      payrollMonth(u, f.employee.employeeId, month),
    ),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
  expect(debt.calculation).toMatchObject({
    netPayable: '581000',
    employeeCost: '601000',
    incidentRecovered: '20000',
  });
  const incident = await f.incidentDetail(report.result.incidentId);
  expect(debt.obligations[0]).toMatchObject({
    id: incident.confirmation!.obligationId,
    kind: 'incident',
    branchId: f.b,
  });
  const result = await payrollCommands(db.pool).execute(
    f.admin.token,
    cmd(debt, { type: 'payroll.payout', funding }),
  );
  expect(result.status).toBe(200);
  const gain = await db.pool.query(
    "SELECT amount_minor FROM kernel.journal_effect WHERE company_id=$1 AND kind='employee_compensation_share'",
    [f.company],
  );
  expect(gain.rows).toEqual([{ amount_minor: '20000' }]);
  expect(
    (
      await db.pool.query(
        'SELECT sum(amount_minor)::text AS cost FROM employees.payroll_cost_source WHERE company_id=$1',
        [f.company],
      )
    ).rows[0].cost,
  ).toBe('601000');
  const movements = await db.pool.query(
    "SELECT source_kind,branch_id,amount_minor FROM finance.money_movement WHERE company_id=$1 AND source_kind='salary_payout'",
    [f.company],
  );
  expect(movements.rows).toEqual([
    { source_kind: 'salary_payout', branch_id: f.b, amount_minor: '581000' },
  ]);
});
it('incident obligation versus payout on independent backends chooses either revised preview or protected incident period', async () => {
  const other = await f.make('incident-payroll-racer', [f.a, f.b], f.adminRole);
  for (const incidentFirst of [true, false]) {
    const e = f.employee,
      m = offsetMonth(month, incidentFirst ? 2 : 3),
      clock = controlledPayrollClock(() => m + '-05');
    const p = await UnitOfWork.run(db.pool, other.token, f.company, 'employees', (u) =>
      payrollMonth(u, e.employeeId, m, clock),
    );
    const damaged = await f.shipment(),
      report = await f.report(damaged.s.shipmentId),
      confirmation = f.confirmation({ employeeId: e.employeeId, payrollMonth: m }),
      gate = deferred(),
      release = deferred();
    const first = incidentFirst
      ? f.confirm(report.result.incidentId, confirmation, {
          afterObligation: async () => {
            gate.resolve();
            await release.promise;
          },
        })
      : payrollCommands(
          db.pool,
          {
            afterLock: async () => {
              gate.resolve();
              await release.promise;
            },
          },
          clock,
        ).execute(other.token, cmd(p, { type: 'payroll.payout', funding }));
    await Promise.race([
      gate.promise,
      first.then(() => {
        throw Error('Race command completed before barrier');
      }),
    ]);
    const second = (
      incidentFirst
        ? payrollCommands(db.pool, {}, clock).execute(
            other.token,
            cmd(p, { type: 'payroll.payout', funding }),
          )
        : f.confirm(report.result.incidentId, confirmation)
    ).catch((e) => e);
    try {
      await waitForBlocked(db.pool);
    } finally {
      release.resolve();
    }
    expect((await first).status).toBe(200);
    expect((await second).message).toBe(
      incidentFirst ? 'PAYROLL_REVISED' : 'PAYROLL_PERIOD_PROTECTED',
    );
    const after = await UnitOfWork.run(db.pool, other.token, f.company, 'employees', (u) =>
      payrollMonth(u, e.employeeId, m, clock),
    );
    expect(after.calculation.netPayable).toBe(incidentFirst ? '580000' : '600000');
    expect(after.obligations.filter((o) => o.month === m).length).toBe(incidentFirst ? 1 : 0);
  }
});
it('AC08 late immutable historical earning after paid month becomes one explicit linked future adjustment', async () => {
  const old = await read(),
    x = await f.received({ service: 'company_packed' }),
    a = x.arrival();
  await f.receive(a);
  await drain();
  await f.receive(a);
  await drain();
  const withReview = await read();
  expect(withReview.calculation).toEqual(old.calculation);
  expect(withReview.payment).toEqual(old.payment);
  const r = withReview.reviews.find((r) => r.kind === 'late_commission' && !r.resolvedMonth)!;
  expect(r).toMatchObject({
    amountMinor: '500',
    workMonth: month,
    postedMinor: '0',
    branchId: f.a,
  });
  const future = await read(offsetMonth(month, 1));
  const resolve = cmd(future, {
    type: 'payroll.resolve',
    reviewId: r.id,
    reason: 'Approve immutable historical commission at captured rate',
  });
  const service = payrollCommands(db.pool),
    result = await service.execute(f.admin.token, resolve);
  expect(await service.execute(f.admin.token, resolve)).toEqual(result);
  const after = await read(offsetMonth(month, 1));
  expect(after.calculation.positiveEarningAdjustments).toBe('500');
  expect(after.earnings.find((e) => e.kind === 'earning_correction')).toMatchObject({
    visitId: r.visitId,
    workDate: r.workDate,
    amountMinor: '500',
  });
  await expect(
    service.execute(
      f.admin.token,
      cmd(after, {
        type: 'payroll.resolve',
        reviewId: r.id,
        reason: 'Duplicate source settlement',
      }),
    ),
  ).rejects.toThrow('SOURCE_REVIEW_NOT_RESOLVABLE');
  expect((await read()).payment).toEqual(old.payment);
});
it('a corrected protected source retains payment and posted recovery, shows review, and holds only its affected month', async () => {
  const before = await read(),
    revised = await firstVisit.outcome('refused');
  revised.revision = 2;
  const correction = {
    correctionId: randomUUID(),
    previousOutcomeId: firstOutcome.outcomeId,
    previousRevision: 1,
    outcome: revised,
    evidenceActionId: null,
    evidenceReceiptId: null,
  };
  const event = f.event(
    'outcome.corrected',
    { correction, previousOutcome: firstOutcome },
    firstVisit.task.taskId,
    3,
  );
  await f.receive(event);
  await drain();
  await f.receive(event);
  await drain();
  const after = await read();
  expect(after.payment).toEqual(before.payment);
  expect(after.calculation).toEqual(before.calculation);
  expect(after.blockers).toContain('SOURCE_REVIEW_REQUIRED');
  expect(after.reviews.filter((r) => r.kind === 'source_conflict')).toHaveLength(1);
  const newer = await read(offsetMonth(month, 4));
  expect(newer.blockers).toEqual([]);
  await expect(
    payrollCommands(db.pool).execute(
      f.admin.token,
      cmd(newer, {
        type: 'payroll.resolve',
        reviewId: after.reviews.find((r) => r.kind === 'source_conflict')!.id,
        reason: 'Must not invent a delta for an unresolved source',
      }),
    ),
  ).rejects.toThrow('SOURCE_REVIEW_NOT_RESOLVABLE');
});
