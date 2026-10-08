import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { payrollFixture, offsetMonth, deferred, waitForBlocked } from './fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { payrollMonth } from '../../../apps/api/src/modules/employees/payroll.service.js';
import { validatePayrollMonth } from '@shahn/contracts';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof payrollFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await payrollFixture(db.pool);
});
afterAll(async () => {
  if (f) {
    const tables = {
      periods:
        'SELECT employee_id,month,state,version,source_digest,calculation FROM employees.payroll_period WHERE company_id=$1 ORDER BY employee_id,month',
      obligations:
        'SELECT * FROM employees.obligation_balance WHERE company_id=$1 ORDER BY employee_id,id',
      recoveries:
        'SELECT * FROM employees.payroll_recovery WHERE company_id=$1 ORDER BY employee_id,month,obligation_id',
      payments:
        'SELECT * FROM employees.salary_payment WHERE company_id=$1 ORDER BY employee_id,month',
      cash: "SELECT id,source_id,source_kind,account_id,branch_id,method,actual_date,amount_minor,direction FROM finance.money_movement WHERE company_id=$1 AND source_kind IN ('employee_advance','salary_payout') ORDER BY recorded_at",
    };
    const evidence: Record<string, unknown> = { companyId: f.company, sourceMonth: f.month };
    for (const [name, sql] of Object.entries(tables))
      evidence[name] = (await db.pool.query(sql, [f.company])).rows;
    await writeFile(
      'docs/verification/P20/native-reconciliation.json',
      JSON.stringify(evidence, null, 2),
    );
  }
  await db?.dispose();
});
it('AC06 funds, method, arbitrary partial amount and future actual date reject without side effects', async () => {
  const e = await f.create('دفع مرفوض'),
    p = await f.read(e.employeeId);
  for (const funding of [
    { ...f.funding, accountId: f.bank, method: 'bank_deposit' },
    { ...f.funding, accountId: f.bank },
    { ...f.funding, actualDate: '2099-01-01' },
  ])
    await expect(
      f.service().execute(f.admin.token, f.command(p, { type: 'payroll.payout', funding })),
    ).rejects.toThrow();
  await expect(
    f.service().execute(f.admin.token, {
      ...f.command(p, { type: 'payroll.payout', funding: f.funding }),
      amountMinor: '1',
    } as never),
  ).rejects.toThrow('VALIDATION_FAILED');
  expect(await f.read(e.employeeId)).toEqual(p);
});
it('a past edit materializes and freezes a previously unprocessed salary before rejecting the edit', async () => {
  const e = await f.create('حماية شهر غير معالج'),
    p = await f.read(e.employeeId);
  f.now.today = offsetMonth(f.month, 1) + '-03';
  try {
    await expect(
      f.service().execute(
        f.admin.token,
        f.command(p, {
          type: 'payroll.adjustment',
          kind: 'bonus',
          amountMinor: '1000',
          reason: 'Past edit must not reopen salary',
          workDate: f.month + '-01',
        }),
      ),
    ).rejects.toThrow('PAYROLL_REVISED');
    const row = (
      await db.pool.query(
        'SELECT state,calculation FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2',
        [f.company, e.employeeId],
      )
    ).rows[0];
    expect(row.state).toBe('frozen_unpaid');
    expect(row.calculation.calculation.salary).toBe('600000');
    expect(
      (
        await db.pool.query(
          'SELECT 1 FROM employees.payroll_adjustment WHERE company_id=$1 AND employee_id=$2',
          [f.company, e.employeeId],
        )
      ).rowCount,
    ).toBe(0);
  } finally {
    f.now.today = f.funding.actualDate;
  }
});
it('AC09 salary correction versus payout and adjustment versus freeze choose a guarded order', async () => {
  const e = await f.create('تصحيح متزامن'),
    p = await f.read(e.employeeId),
    other = await f.make('salary-corrector', [f.a, f.b], f.adminRole);
  const entered = deferred(),
    release = deferred();
  const edit = employeeCommands(db.pool, {
    beforeTermsWrite: async () => {
      entered.resolve();
      await release.promise;
    },
  }).execute(other.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'employee.terms',
    employeeId: e.employeeId,
    expectedVersion: e.version,
    change: {
      salary: {
        month: f.month,
        terms: { enabled: true, monthly: { currency: 'EGP', amountMinor: '620000' } },
      },
      commission: null,
      reason: 'Current salary correction',
    },
  });
  await entered.promise;
  const pay = f
    .service()
    .execute(f.admin.token, f.command(p, { type: 'payroll.payout', funding: f.funding }))
    .catch((e) => e);
  try {
    await waitForBlocked(db.pool);
  } finally {
    release.resolve();
  }
  await edit;
  expect((await pay).message).toBe('PAYROLL_REVISED');
  const revised = await f.read(e.employeeId);
  expect(revised.calculation.salary).toBe('620000');
  const gate = deferred(),
    resume = deferred();
  const payout = f
    .service({
      afterLock: async () => {
        gate.resolve();
        await resume.promise;
      },
    })
    .execute(f.admin.token, f.command(revised, { type: 'payroll.payout', funding: f.funding }));
  await gate.promise;
  const adjust = f
    .service()
    .execute(
      other.token,
      f.command(revised, {
        type: 'payroll.adjustment',
        kind: 'bonus',
        amountMinor: '1000',
        reason: 'Concurrent bonus',
        workDate: f.now.today,
      }),
    )
    .catch((e) => e);
  try {
    await waitForBlocked(db.pool);
  } finally {
    resume.resolve();
  }
  await payout;
  expect((await adjust).message).toBe('PAYROLL_REVISED');
});
it('before-commit connection termination rolls back; committed payment survives database restart and identity recovery', async () => {
  const e = await f.create('حدود المتانة');
  await f.issue(e.employeeId);
  const p = await f.read(e.employeeId),
    c = f.command(p, { type: 'payroll.payout', funding: f.funding });
  let pid = 0;
  await expect(
    f
      .service({
        afterLock: async (u) => {
          pid = (await u.client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        },
        fault: async (stage) => {
          if (stage === 'cash') await db.pool.query('SELECT pg_terminate_backend($1)', [pid]);
        },
      })
      .execute(f.admin.token, c),
  ).rejects.toThrow();
  expect((await f.read(e.employeeId)).state).toBe('editable_unpaid');
  expect((await f.read(e.employeeId)).calculation.netPayable).toBe('500000');
  const committed = await f.service().execute(f.admin.token, c);
  await db.stop();
  await db.start();
  expect(await f.service().execute(f.admin.token, c)).toEqual(committed);
});
it('AC01/02 actual advance + earning deduction: cash 4800, cost 5800, original recovery and no receipt', async () => {
  const e = await f.create();
  expect((await f.issue(e.employeeId)).status).toBe(200);
  expect((await f.adjustment(e.employeeId)).status).toBe(200);
  const p = await f.read(e.employeeId);
  expect(validatePayrollMonth(p), JSON.stringify(validatePayrollMonth.errors)).toBe(true);
  expect(p.calculation).toMatchObject({
    salary: '600000',
    commission: '0',
    grossEarning: '600000',
    newAdvancesDue: '100000',
    newOrdinaryDeductions: '20000',
    advanceRecovered: '100000',
    earningDeductionsRecovered: '20000',
    netPayable: '480000',
    employeeCost: '580000',
    carryRemaining: '0',
  });
  expect(
    (
      await db.pool.query(
        'SELECT * FROM employees.payroll_recovery WHERE company_id=$1 AND employee_id=$2',
        [f.company, e.employeeId],
      )
    ).rowCount,
  ).toBe(0);
  const command = f.command(p, { type: 'payroll.payout', funding: f.funding }),
    r = await f.service().execute(f.admin.token, command);
  expect(r.status).toBe(200);
  expect(await f.service().execute(f.admin.token, command)).toEqual(r);
  const paid = await f.read(e.employeeId);
  expect(paid.state).toBe('paid');
  expect(paid.calculation).toEqual(p.calculation);
  const rows = (
    await db.pool.query(
      `SELECT m.source_kind,m.direction,m.amount_minor::text FROM finance.money_movement m WHERE m.company_id=$1 AND (EXISTS(SELECT 1 FROM employees.advance a WHERE a.company_id=m.company_id AND a.movement_id=m.id AND a.employee_id=$2) OR EXISTS(SELECT 1 FROM employees.salary_payment s WHERE s.company_id=m.company_id AND s.movement_id=m.id AND s.employee_id=$2)) ORDER BY m.recorded_at`,
      [f.company, e.employeeId],
    )
  ).rows;
  expect(rows).toEqual([
    { source_kind: 'employee_advance', direction: 'withdrawal', amount_minor: '100000' },
    { source_kind: 'salary_payout', direction: 'withdrawal', amount_minor: '480000' },
  ]);
  await expect(f.pay(e.employeeId)).rejects.toThrow('ALREADY_PAID');
  await expect(f.adjustment(e.employeeId)).rejects.toThrow('PAYROLL_PERIOD_PROTECTED');
});
it('AC03 zero closure then next month recovers remaining original 500 once', async () => {
  const e = await f.create('صفر ثم ترحيل', '300000');
  await f.issue(e.employeeId, '350000');
  const p = await f.read(e.employeeId);
  expect(p.calculation).toMatchObject({
    netPayable: '0',
    recoveryThisPeriod: '300000',
    carryRemaining: '50000',
    employeeCost: '300000',
  });
  const r = await f.service().execute(f.admin.token, f.command(p, { type: 'payroll.zero-close' }));
  expect(r.status).toBe(200);
  const next = offsetMonth(f.month, 1);
  const n = await f.read(e.employeeId, next);
  expect(n.calculation).toMatchObject({
    netPayable: '250000',
    priorCarriedUnrecoveredObligations: '50000',
    employeeCost: '300000',
  });
  const ledger = (
    await db.pool.query(
      'SELECT * FROM employees.obligation_balance WHERE company_id=$1 AND employee_id=$2',
      [f.company, e.employeeId],
    )
  ).rows[0];
  expect(ledger.outstanding_amount).toBe('50000');
  const close = await f.read(e.employeeId);
  expect(close.payment).toMatchObject({ amountMinor: '0', accountId: null, movementId: null });
  f.now.today = next + '-05';
  try {
    const command = f.command(await f.read(e.employeeId, next), {
      type: 'payroll.payout',
      funding: f.funding,
    });
    await f.service().execute(f.admin.token, command);
    await f.service().execute(f.admin.token, command);
    const original = (
      await db.pool.query(
        'SELECT outstanding_amount,reserved_for_frozen_periods,available_for_new_allocation FROM employees.obligation_balance WHERE company_id=$1 AND employee_id=$2',
        [f.company, e.employeeId],
      )
    ).rows[0];
    expect(original).toEqual({
      outstanding_amount: '0',
      reserved_for_frozen_periods: '0',
      available_for_new_allocation: '0',
    });
    const allocations = (
      await db.pool.query(
        'SELECT month,amount_minor,state,obligation_id FROM employees.payroll_recovery WHERE company_id=$1 AND employee_id=$2 ORDER BY month',
        [f.company, e.employeeId],
      )
    ).rows;
    expect(allocations.map((a) => [a.amount_minor, a.state])).toEqual([
      ['300000', 'settled'],
      ['50000', 'settled'],
    ]);
    expect(new Set(allocations.map((a) => a.obligation_id)).size).toBe(1);
    expect((await f.read(e.employeeId, offsetMonth(next, 1))).calculation.netPayable).toBe(
      '300000',
    );
  } finally {
    f.now.today = f.funding.actualDate;
  }
});
it('Cash, Bank deposit and InstaPay preserve actual funding and full payroll while earning cost retains employee branch', async () => {
  await financeCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'movement.create',
    fields: {
      accountId: f.bank,
      branchId: f.b,
      currency: 'EGP',
      amountMinor: '2000000',
      actualDate: f.funding.actualDate,
      method: 'bank_deposit',
      direction: 'deposit',
      reason: 'Isolated bank payroll funds',
    },
  });
  const e = await f.create('سلفة إنستا باي وراتب بنكي'),
    funding = { ...f.funding, accountId: f.bank, branchId: f.b, method: 'instapay' as const };
  await f.service().execute(
    f.admin.token,
    f.command(await f.read(e.employeeId), {
      type: 'payroll.advance',
      amountMinor: '100000',
      funding,
    }),
  );
  await f.service().execute(
    f.admin.token,
    f.command(await f.read(e.employeeId), {
      type: 'payroll.payout',
      funding: { ...funding, method: 'bank_deposit' },
    }),
  );
  const paid = await f.read(e.employeeId);
  expect(paid.branchId).toBe(f.a);
  expect(paid.payment).toMatchObject({
    method: 'bank_deposit',
    accountId: f.bank,
    branchId: f.b,
    amountMinor: '500000',
  });
  expect(paid.obligations[0]?.advancePayment).toMatchObject({
    method: 'instapay',
    accountId: f.bank,
    branchId: f.b,
  });
  expect(paid.calculation.employeeCost).toBe('600000');
  const next = await f.create('راتب إنستا باي');
  await f
    .service()
    .execute(
      f.admin.token,
      f.command(await f.read(next.employeeId), { type: 'payroll.payout', funding }),
    );
  expect((await f.read(next.employeeId)).payment?.method).toBe('instapay');
});
it('AC11 old unpaid freeze reserves 1000, later salary stays 6000, paying old settles fixed 5000', async () => {
  const e = await f.create('رصيد محفوظ');
  await f.issue(e.employeeId);
  const initial = await f.read(e.employeeId);
  f.now.today = offsetMonth(f.month, 1) + '-05';
  try {
    const gate = deferred(),
      resume = deferred(),
      other = await f.make('reserved-racer', [f.a, f.b], f.adminRole);
    const freezing = UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', async (u) => {
      const p = await payrollMonth(u, e.employeeId, f.month, f.clock);
      gate.resolve();
      await resume.promise;
      return p;
    });
    await gate.promise;
    const newer = f.read(e.employeeId, offsetMonth(f.month, 1), other.token);
    try {
      await waitForBlocked(db.pool);
    } finally {
      resume.resolve();
    }
    const jan = await freezing;
    expect(jan.state).toBe('frozen_unpaid');
    expect(jan.calculation.netPayable).toBe('500000');
    const feb = await newer;
    expect(feb.calculation).toMatchObject({
      netPayable: '600000',
      outstandingAmount: '100000',
      reservedForFrozenPeriods: '100000',
      availableForNewAllocation: '0',
    });
    expect((await f.pay(e.employeeId, feb.month)).status).toBe(200);
    expect((await f.pay(e.employeeId)).status).toBe(200);
    const final = await f.read(e.employeeId);
    expect(final.calculation).toEqual(initial.calculation);
    expect(
      (
        await db.pool.query(
          'SELECT state,amount_minor FROM employees.payroll_recovery WHERE company_id=$1 AND employee_id=$2',
          [f.company, e.employeeId],
        )
      ).rows,
    ).toEqual([{ state: 'settled', amount_minor: '100000' }]);
  } finally {
    f.now.today = f.funding.actualDate;
  }
});
it('AC10 failures after debit, allocation and cash leave no advance/debt/freeze/payment; original command retries', async () => {
  const e = await f.create('تراجع ذري');
  const p = await f.read(e.employeeId),
    c = f.command(p, { type: 'payroll.advance', amountMinor: '100000', funding: f.funding });
  await expect(
    f
      .service({
        fault: async (stage) => {
          if (stage === 'advance-debit') throw Error('injected');
        },
      })
      .execute(f.admin.token, c),
  ).rejects.toThrow('injected');
  expect((await f.read(e.employeeId)).calculation.netPayable).toBe('600000');
  expect((await f.service().execute(f.admin.token, c)).status).toBe(200);
  const before = await f.read(e.employeeId),
    pay = f.command(before, { type: 'payroll.payout', funding: f.funding });
  for (const stop of ['allocations', 'cash', 'result']) {
    await expect(
      f
        .service({
          fault: async (stage) => {
            if (stage === stop) throw Error('injected');
          },
        })
        .execute(f.admin.token, pay),
    ).rejects.toThrow('injected');
    const after = await f.read(e.employeeId);
    expect(after).toEqual(before);
  }
  expect((await f.service().execute(f.admin.token, pay)).status).toBe(200);
});
it('AC07 independent concurrent commands and retained winning identity debit once', async () => {
  const e = await f.create('تزامن');
  await f.issue(e.employeeId);
  const p = await f.read(e.employeeId),
    entered = deferred(),
    release = deferred();
  const other = await f.make('payroll-racer', [f.a, f.b], f.adminRole);
  const one = f.command(p, { type: 'payroll.payout', funding: f.funding }),
    two = f.command(p, { type: 'payroll.payout', funding: f.funding });
  const a = f
    .service({
      afterLock: async () => {
        entered.resolve();
        await release.promise;
      },
    })
    .execute(f.admin.token, one);
  await entered.promise;
  const b = f
    .service()
    .execute(other.token, two)
    .catch((e) => e.reply);
  try {
    await waitForBlocked(db.pool);
  } finally {
    release.resolve();
  }
  const [ra, rb] = await Promise.all([a, b]);
  expect(ra.status).toBe(200);
  expect(rb.body).toMatchObject({ code: 'ALREADY_PAID' });
  expect(await f.service().execute(f.admin.token, one)).toEqual(ra);
  expect(
    (
      await db.pool.query(
        'SELECT * FROM employees.salary_payment WHERE company_id=$1 AND employee_id=$2',
        [f.company, e.employeeId],
      )
    ).rowCount,
  ).toBe(1);
});
