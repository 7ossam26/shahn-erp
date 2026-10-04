import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, migrationStatus } from '@shahn/database';
import type { FinanceCommand, FinanceResult, FinanceFilter } from '@shahn/contracts';
import { accessFixture } from '../support/access.js';
import { createApplication } from '../../apps/api/src/app.js';
import {
  financeCommands,
  financeCatalog,
  accountList,
} from '../../apps/api/src/modules/finance/service.js';
import {
  AccountFundsService,
  reconcileAccounts,
} from '../../apps/api/src/modules/finance/accounts/service.js';
import { expenseDetail, expenseList } from '../../apps/api/src/modules/finance/expenses/service.js';
import { movementList } from '../../apps/api/src/modules/finance/money-movements/service.js';
import { commercialCommands } from '../../apps/api/src/modules/brands/service.js';
import { trialCommands } from '../../apps/api/src/modules/kernel/trial.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
import { seedEmployees } from '../../apps/api/src/modules/employees/seed.js';
import { seedFinance } from '../../apps/api/src/modules/finance/seed.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  service: ReturnType<typeof financeCommands>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
let cash: FinanceResult,
  bank: FinanceResult,
  category: string,
  expense: FinanceResult,
  expenseCommand: FinanceCommand;
const reports: Record<string, unknown> = {};
const cmd = (draft: object) =>
  ({ schemaVersion: 1, companyId: f.company, commandId: randomUUID(), ...draft }) as FinanceCommand;
const run = async (draft: object, token = f.admin.token) =>
  (await service.execute(token, cmd(draft))).body as FinanceResult;
const fields = (
  accountId = cash.entityId,
  branchId = f.b,
  amountMinor = '100000',
  method = 'cash',
) => ({ accountId, branchId, amountMinor, currency: 'EGP', method, actualDate: '2026-09-01' });
const create = async (name: string, type = 'cash', branchIds = [f.b]) =>
  run({
    type: 'account.create',
    fields: { name, type, currency: 'EGP', branchIds, active: true, bankDescription: '' },
  });
const balance = async (id = cash.entityId) =>
  (
    await db.pool.query(
      'SELECT amount_minor::text AS balance FROM finance.account_balance WHERE account_id=$1',
      [id],
    )
  ).rows[0].balance;
const filter = (overrides: object = {}): FinanceFilter => ({
  search: '',
  branchId: null,
  accountId: null,
  categoryId: null,
  actorId: null,
  method: 'all',
  direction: 'all',
  dateBasis: 'actual',
  from: null,
  to: null,
  page: 1,
  limit: 25,
  ...overrides,
});
async function http(path: string, body?: unknown, token = f.admin.token, csrf = f.admin.csrfToken) {
  const r = await fetch(origin + '/api/v1/finance' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: 'erp_session=' + token,
      ...(body
        ? { 'Content-Type': 'application/json', Origin: f.config.origin, 'X-CSRF-Token': csrf }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json() };
}
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 12));
  f = await accessFixture(db.pool);
  await trialCommands(db.pool, 'test').execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'kernel.seed',
    brandId: randomUUID(),
    branchId: f.a,
    sourceId: randomUUID(),
    expectedVersion: 1,
    money: { currency: 'EGP', amountMinor: '100000' },
  });
  const old = (
    await db.pool.query('SELECT to_jsonb(j) AS body FROM kernel.journal_effect j ORDER BY id')
  ).rows;
  await migrate(db.pool);
  expect((await migrationStatus(db.pool)).state).toBe('current');
  expect(
    (await db.pool.query('SELECT to_jsonb(j) AS body FROM kernel.journal_effect j ORDER BY id'))
      .rows,
  ).toEqual(old);
  reports.upgrade = {
    retainedRows: old.length,
    migrations: (await migrationStatus(db.pool)).required,
  };
  await db.pool.query(
    "INSERT INTO access.role_grant SELECT $1,$2,id FROM access.screen_capability WHERE id LIKE 'finance.%' ON CONFLICT DO NOTHING",
    [f.company, f.adminRole],
  );
  for (const staff of [f.staffB, f.staffAB])
    await db.pool.query(
      "INSERT INTO access.user_exception VALUES($1,$2,'expenses','allow'),($1,$2,'finance.movements','allow')",
      [f.company, staff.id],
    );
  service = financeCommands(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
}, 90000);
afterAll(async () => {
  if (db)
    await writeFile(
      'docs/verification/P09/database-results.json',
      JSON.stringify(reports, null, 2),
    );
  await app?.close();
  await db?.dispose();
}, 60000);
it('upgrades without replay and creates accounts at zero, idempotently', async () => {
  const c = cmd({
    type: 'account.create',
    fields: {
      name: 'P09 خزينة ب',
      type: 'cash',
      currency: 'EGP',
      branchIds: [f.b],
      active: true,
      bankDescription: '',
    },
  });
  cash = (await service.execute(f.admin.token, c)).body as FinanceResult;
  expect((await service.execute(f.admin.token, c)).body).toEqual(cash);
  expect(await balance()).toBe('0');
  expect(
    (
      await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [
        cash.entityId,
      ])
    ).rows[0].count,
  ).toBe('0');
  bank = await create('P09 بنك الشركة', 'bank', [f.a, f.b]);
  const r = await commercialCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'reference.create',
    fields: {
      kind: 'expense_category',
      name: 'P09 إيجار',
      active: true,
      parentId: null,
      volumeRange: null,
    },
  });
  category = (r.body as { entityId: string }).entityId;
});
it('deposit1000 expense200 withdrawal100 commits balance700, three movements and one cost', async () => {
  const employee = await seedEmployees(db.pool, f.admin.token, f.company, f.b, 'test');
  await db.pool.query(
    "UPDATE employees.payroll_period SET state='paid',version=version+1 WHERE employee_id=$1",
    [employee.salma.employeeId],
  );
  const payroll = (
    await db.pool.query(
      'SELECT to_jsonb(p) AS body FROM employees.payroll_period p WHERE employee_id=$1',
      [employee.salma.employeeId],
    )
  ).rows;
  expect(payroll.length).toBeGreaterThan(0);
  await run({ type: 'movement.create', fields: { ...fields(), direction: 'deposit', reason: '' } });
  expenseCommand = cmd({
    type: 'expense.create',
    fields: {
      ...fields(cash.entityId, f.b, '20000'),
      categoryId: category,
      description: 'P09 إيجار سبتمبر',
    },
  });
  expense = (await service.execute(f.admin.token, expenseCommand)).body as FinanceResult;
  await run({
    type: 'movement.create',
    fields: { ...fields(cash.entityId, f.b, '10000'), direction: 'withdrawal', reason: '' },
  });
  expect(await balance()).toBe('70000');
  const totals = (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM finance.money_movement WHERE account_id=$1) AS movements,(SELECT sum(amount_minor)::text FROM finance.paid_cost) AS cost`,
      [cash.entityId],
    )
  ).rows[0];
  expect(totals).toEqual({ movements: 3, cost: '20000' });
  const d = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'expenses', (u) =>
    expenseDetail(u, expense.entityId),
  );
  expect(d.actualDate).toBe('2026-09-01');
  expect(d.actorId).toBe(f.admin.id);
  expect(d.recordedAt.slice(0, 10)).not.toBe(d.actualDate);
  reports.trial = { cash, bank, expense, totals, detail: d };
  expect(
    (
      await db.pool.query(
        'SELECT to_jsonb(p) AS body FROM employees.payroll_period p WHERE employee_id=$1',
        [employee.salma.employeeId],
      )
    ).rows,
  ).toEqual(payroll);
  reports.protectedPayrollUnchanged = true;
});
it('B-only shared bank funding preserves branchB and rejects forged branchA and method mismatch', async () => {
  await run({
    type: 'movement.create',
    fields: {
      ...fields(bank.entityId, f.a, '100000', 'bank_deposit'),
      direction: 'deposit',
      reason: '',
    },
  });
  const e = await run(
    {
      type: 'expense.create',
      fields: {
        ...fields(bank.entityId, f.b, '20000', 'instapay'),
        categoryId: category,
        description: 'P09 بنك ب',
      },
    },
    f.staffB.token,
  );
  expect(
    (
      await UnitOfWork.run(db.pool, f.staffB.token, f.company, 'expenses', (u) =>
        expenseDetail(u, e.entityId),
      )
    ).branchId,
  ).toBe(f.b);
  await expect(
    run(
      {
        type: 'expense.create',
        fields: {
          ...fields(bank.entityId, f.a, '20000', 'instapay'),
          categoryId: category,
          description: 'forged',
        },
      },
      f.staffB.token,
    ),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
  await expect(
    run({
      type: 'movement.create',
      fields: { ...fields(bank.entityId), direction: 'withdrawal', reason: '' },
    }),
  ).rejects.toThrow('METHOD_ACCOUNT_MISMATCH');
  expect(await balance(bank.entityId)).toBe('80000');
});
it('insufficient past expense rejects without effects and has recoverable audit', async () => {
  const c = cmd({
    type: 'expense.create',
    fields: {
      ...fields(cash.entityId, f.b, '80000'),
      categoryId: category,
      description: 'P09 insufficient',
    },
  });
  await expect(service.execute(f.admin.token, c)).rejects.toThrow('INSUFFICIENT_FUNDS');
  expect(
    (await service.recover(f.admin.token, f.company, 'finance.expenses', c.commandId)).status,
  ).toBe(409);
  expect(await balance()).toBe('70000');
  expect(
    (
      await db.pool.query('SELECT count(*) FROM finance.paid_expense WHERE description=$1', [
        'P09 insufficient',
      ])
    ).rows[0].count,
  ).toBe('0');
  expect(
    (
      await db.pool.query(
        `SELECT count(*) FROM audit_entry a JOIN command_record c ON c.id=a.command_record_id WHERE c.command_id=$1`,
        [c.commandId],
      )
    ).rows[0].count,
  ).toBe('1');
});
it.each(['afterExpenseInsert', 'afterPosting', 'beforeResult'] as const)(
  'rolls back expense, journal, projection, audit and result at %s',
  async (hook) => {
    const c = cmd({
      type: 'expense.create',
      fields: {
        ...fields(cash.entityId, f.b, '100'),
        categoryId: category,
        description: 'P09 ' + hook,
      },
    });
    const failing = financeCommands(db.pool, {
      [hook]: async () => {
        throw Error('INJECTED_FAILURE');
      },
    });
    const before = (await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0]
      .count;
    await expect(failing.execute(f.admin.token, c)).rejects.toThrow('INJECTED_FAILURE');
    expect(await balance()).toBe('70000');
    expect((await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0].count).toBe(
      before,
    );
    expect(
      (
        await db.pool.query('SELECT count(*) FROM command_record WHERE command_id=$1', [
          c.commandId,
        ])
      ).rows[0].count,
    ).toBe('0');
    expect(
      (
        await db.pool.query('SELECT count(*) FROM finance.paid_expense WHERE description=$1', [
          'P09 ' + hook,
        ])
      ).rows[0].count,
    ).toBe('0');
  },
);
it.each(['movement', 'expense'])(
  'serializes competing700 withdrawals through the shared account lock: %s first',
  async (first) => {
    const a = await create('P09 race ' + first);
    await run({
      type: 'movement.create',
      fields: { ...fields(a.entityId), direction: 'deposit', reason: '' },
    });
    let release!: () => void, entered!: () => void;
    const barrier = new Promise<void>((r) => (release = r)),
      held = new Promise<void>((r) => (entered = r));
    const controlled = financeCommands(db.pool, {
      afterAccountLock: async () => {
        entered();
        await barrier;
      },
    });
    const move = cmd({
        type: 'movement.create',
        fields: { ...fields(a.entityId, f.b, '70000'), direction: 'withdrawal', reason: '' },
      }),
      paid = cmd({
        type: 'expense.create',
        fields: {
          ...fields(a.entityId, f.b, '70000'),
          categoryId: category,
          description: 'P09 race',
        },
      });
    const p1 = controlled.execute(f.admin.token, first === 'movement' ? move : paid);
    await held;
    const p2 = service.execute(f.staffB.token, first === 'movement' ? paid : move).catch((e) => e);
    // Observe an independent PostgreSQL backend actually waiting on the first lock.
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      waiting =
        (
          await db.pool.query(
            "SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%kernel.resource%' AND pid<>pg_backend_pid()",
          )
        ).rowCount !== 0;
      if (waiting) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    release();
    await p1;
    expect((await p2).code).toBe('INSUFFICIENT_FUNDS');
    expect(waiting).toBe(true);
    expect(await balance(a.entityId)).toBe('30000');
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM finance.money_movement WHERE account_id=$1 AND direction='withdrawal'",
          [a.entityId],
        )
      ).rows[0].count,
    ).toBe('1');
    reports['race-' + first] = { waiting, balance: '30000' };
  },
);
it('rejects stale account setup, preserves history on deactivation and gates pending obligations', async () => {
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', async (u) => {
    const funds = new AccountFundsService(u);
    await funds.lock([bank.entityId]);
    await funds.registerObligation(bank.entityId, 'transfer', 'pending-P10');
    await funds.registerObligation(bank.entityId, 'observation', 'unresolved-P21');
  });
  await expect(
    run({ type: 'account.deactivate', accountId: bank.entityId, expectedVersion: 1 }),
  ).rejects.toThrow('ACCOUNT_OBLIGATIONS_PENDING');
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', async (u) => {
    const funds = new AccountFundsService(u);
    await funds.lock([bank.entityId]);
    await funds.resolveObligation(bank.entityId, 'transfer', 'pending-P10');
  });
  await expect(
    run({ type: 'account.deactivate', accountId: bank.entityId, expectedVersion: 1 }),
  ).rejects.toThrow('ACCOUNT_OBLIGATIONS_PENDING');
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', async (u) => {
    const funds = new AccountFundsService(u);
    await funds.lock([bank.entityId]);
    await funds.resolveObligation(bank.entityId, 'observation', 'unresolved-P21');
  });
  await run({ type: 'account.deactivate', accountId: bank.entityId, expectedVersion: 1 });
  await expect(
    run({ type: 'account.deactivate', accountId: bank.entityId, expectedVersion: 1 }),
  ).rejects.toThrow('REVISION_CONFLICT');
  await expect(
    run({
      type: 'movement.create',
      fields: { ...fields(bank.entityId, f.b, '10', 'instapay'), direction: 'deposit', reason: '' },
    }),
  ).rejects.toThrow('ACCOUNT_INACTIVE');
  expect(await balance(bank.entityId)).toBe('80000');
  await commercialCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'reference.update',
    entityId: category,
    expectedVersion: 1,
    fields: {
      kind: 'expense_category',
      name: 'P09 renamed',
      active: false,
      parentId: null,
      volumeRange: null,
    },
  });
  expect(
    (
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'expenses', (u) =>
        expenseDetail(u, expense.entityId),
      )
    ).categoryName,
  ).toBe('P09 إيجار');
  await expect(
    run({
      type: 'expense.create',
      fields: {
        ...fields(cash.entityId, f.b, '100'),
        categoryId: category,
        description: 'inactive category',
      },
    }),
  ).rejects.toThrow('INVALID_GEOGRAPHY_OR_TIER');
});
it('closed real HTTP validates CSRF, filters, cross-company IDs and revoked preview grants', async () => {
  expect(
    (
      await http('/commands', {
        ...expenseCommand,
        fields: { ...('fields' in expenseCommand ? expenseCommand.fields : {}), amountMinor: '0' },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await http(
        '/commands',
        cmd({ type: 'account.deactivate', accountId: cash.entityId, expectedVersion: 1 }),
        f.admin.token,
        'bad',
      )
    ).status,
  ).toBe(403);
  expect((await http('/accounts/' + cash.entityId + '?companyId=' + f.other)).status).toBe(403);
  expect(
    (
      await http(
        '/movements?companyId=' + f.company + '&accountId=' + randomUUID(),
        undefined,
        f.staffB.token,
      )
    ).status,
  ).toBe(404);
  expect(
    (await http('/expenses?companyId=' + f.company + '&branchId=' + f.a, undefined, f.staffB.token))
      .status,
  ).toBe(403);
  expect(
    (await http('/catalog?companyId=' + f.company + '&screen=expenses', undefined, f.staffB.token))
      .body.branches,
  ).toEqual([{ id: f.b, name: 'الفرع ب' }]);
  expect(
    (
      await http(
        '/expenses?companyId=' +
          f.company +
          '&dateBasis=actual&from=2026-09-01&to=2026-09-01&categoryId=' +
          category,
      )
    ).status,
  ).toBe(200);
  await db.pool.query(
    "UPDATE access.user_exception SET effect='deny' WHERE user_id=$1 AND capability='expenses'",
    [f.staffB.id],
  );
  expect((await http('/commands', expenseCommand, f.staffB.token, f.staffB.csrfToken)).status).toBe(
    403,
  );
  await db.pool.query(
    "UPDATE access.user_exception SET effect='allow' WHERE user_id=$1 AND capability='expenses'",
    [f.staffB.id],
  );
});
it('recovers after compaction and denies recovery after branch loss; changed payload conflicts', async () => {
  await expect(
    service.execute(f.admin.token, {
      ...expenseCommand,
      fields: {
        ...('fields' in expenseCommand ? expenseCommand.fields : {}),
        description: 'changed',
      },
    } as FinanceCommand),
  ).rejects.toThrow('COMMAND_PAYLOAD_CONFLICT');
  // Retention time is immutable in normal operation. The test admin advances only this record's clock.
  const client = await db.pool.connect();
  try {
    await client.query("SET session_replication_role='replica'");
    await client.query(
      "UPDATE command_record SET retain_until=clock_timestamp()-interval '1 day' WHERE command_id=$1",
      [expenseCommand.commandId],
    );
    await client.query("SET session_replication_role='origin'");
  } finally {
    client.release();
  }
  await compactCommandResults(db.pool);
  expect(
    (
      await financeCommands(db.pool).recover(
        f.admin.token,
        f.company,
        'finance.expenses',
        expenseCommand.commandId,
      )
    ).body,
  ).toEqual(expense);
  await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
    f.admin.id,
    f.b,
  ]);
  await expect(
    service.recover(f.admin.token, f.company, 'finance.expenses', expenseCommand.commandId),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
  await db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
    f.company,
    f.admin.id,
    f.b,
  ]);
});
it('checks immutable records, exact reconciliation and combined deterministic pagination', async () => {
  for (const table of ['finance.money_movement', 'finance.paid_expense', 'finance.paid_cost'])
    await expect(db.pool.query('DELETE FROM ' + table)).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
  const reconciled = await UnitOfWork.run(
    db.pool,
    f.admin.token,
    f.company,
    'finance.accounts',
    reconcileAccounts,
  );
  expect(reconciled.every((r) => r.projectionMinor === r.journalMinor)).toBe(true);
  reports.reconciliation = reconciled;
  const list = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'expenses', (u) =>
    expenseList(
      u,
      filter({
        accountId: cash.entityId,
        categoryId: category,
        branchId: f.b,
        method: 'cash',
        dateBasis: 'actual',
        from: '2026-09-01',
        to: '2026-09-01',
        limit: 1,
      }),
    ),
  );
  expect(list.total).toBe(1);
  expect(list.items[0]!.id).toBe(expense.entityId);
  expect(
    (await UnitOfWork.run(db.pool, f.staffB.token, f.company, 'expenses', financeCatalog)).branches,
  ).toHaveLength(1);
  expect(
    (
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', (u) =>
        accountList(u),
      )
    ).items.length,
  ).toBeGreaterThan(1);
  expect(
    (
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.movements', (u) =>
        movementList(u, filter({ accountId: cash.entityId })),
      )
    ).total,
  ).toBe(3);
});
it('crashes real process before and after commit, restarts and recovers exactly one record', async () => {
  const a = await create('P09 process recovery');
  const start = async (mode: string) => {
    const child = fork('tests/p09/crash-server.ts', [], {
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: 'tsconfig.base.json',
        P09_TEST_DATABASE_URL: db.url,
        P09_TEST_ORIGIN: f.config.origin,
        P09_CRASH: mode,
      },
    });
    const childOrigin = await new Promise<string>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (c) => reject(Error('CRASH_START_' + c)));
      child.on('message', (m) => {
        if ((m as { origin?: string }).origin) resolve((m as { origin: string }).origin);
      });
    });
    return { child, origin: childOrigin };
  };
  const request = async (o: string, c: FinanceCommand) =>
    fetch(o + '/api/test/finance-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: f.admin.token, command: c }),
    });
  const c = cmd({
    type: 'movement.create',
    fields: { ...fields(a.entityId), direction: 'deposit', reason: '' },
  });
  const early = await start('before'),
    earlyExit = once(early.child, 'exit');
  await expect(request(early.origin, c)).rejects.toThrow();
  expect((await earlyExit)[0]).toBe(74);
  expect(await balance(a.entityId)).toBe('0');
  const late = await start('after'),
    lateExit = once(late.child, 'exit');
  await expect(request(late.origin, c)).rejects.toThrow();
  expect((await lateExit)[0]).toBe(73);
  const restarted = await start('none');
  try {
    const response = await fetch(
      restarted.origin +
        `/api/v1/finance/commands/${c.commandId}?companyId=${f.company}&family=finance.movements`,
      { headers: { Cookie: 'erp_session=' + f.admin.token } },
    );
    expect(response.status).toBe(200);
    const recovered = await response.json();
    expect(await (await request(restarted.origin, c)).json()).toEqual(recovered);
    expect(await balance(a.entityId)).toBe('100000');
    expect(
      (
        await db.pool.query('SELECT count(*) FROM finance.money_movement WHERE account_id=$1', [
          a.entityId,
        ])
      ).rows[0].count,
    ).toBe('1');
    reports.restart = { beforeExit: 74, afterExit: 73, recovered, balance: '100000' };
  } finally {
    const exit = once(restarted.child, 'exit');
    restarted.child.send('stop');
    await exit;
  }
}, 60000);
it('source identity prevents duplicate debit even through a different caller and rejects changed facts', async () => {
  const d = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'expenses', (u) =>
    expenseDetail(u, expense.entityId),
  );
  const before = await balance();
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'expenses', async (u) => {
    const funds = new AccountFundsService(u);
    await funds.lock([cash.entityId]);
    const input = {
      sourceId: d.sourceId,
      recordId: randomUUID(),
      fields: {
        accountId: cash.entityId,
        branchId: f.b,
        amountMinor: '20000',
        currency: 'EGP' as const,
        actualDate: '2026-09-01',
        method: 'cash' as const,
      },
      direction: 'withdrawal' as const,
      sourceKind: 'expense' as const,
      reason: d.description,
    };
    expect((await funds.post(input)).id).toBe(expense.movementId);
    await expect(
      funds.post({ ...input, fields: { ...input.fields, amountMinor: '100' } }),
    ).rejects.toThrow('SOURCE_PAYLOAD_CONFLICT');
  });
  const copies = await Promise.all([
    service.execute(f.admin.token, expenseCommand),
    service.execute(f.admin.token, expenseCommand),
  ]);
  expect(copies.map((r) => r.body)).toEqual([expense, expense]);
  expect(await balance()).toBe(before);
});
it('cross-company actual account ID is hidden in direct reads, commands, filters and recovery', async () => {
  const id = randomUUID(),
    client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO kernel.resource(company_id,id,family) VALUES($1,$2,'money')", [
      f.other,
      id,
    ]);
    await client.query(
      "INSERT INTO finance.account(company_id,id,name,type,currency,cash_branch_id,active,version,bank_description) VALUES($1,$2,'Other company account','cash','EGP',$3,true,1,'')",
      [f.other, id, f.foreign],
    );
    await client.query('INSERT INTO finance.account_balance(company_id,account_id) VALUES($1,$2)', [
      f.other,
      id,
    ]);
    await client.query('INSERT INTO finance.account_usage VALUES($1,$2,$3)', [
      f.other,
      id,
      f.foreign,
    ]);
    await client.query(
      "INSERT INTO finance.account_revision(company_id,account_id,version,fields,actor_id) VALUES($1,$2,1,'{}',$3)",
      [f.other, id, f.admin.id],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  expect((await http('/accounts/' + id + '?companyId=' + f.company)).status).toBe(404);
  expect((await http('/movements?companyId=' + f.company + '&accountId=' + id)).status).toBe(404);
  expect(
    (
      await http(
        '/commands',
        cmd({
          type: 'movement.create',
          fields: { ...fields(id), direction: 'deposit', reason: '' },
        }),
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await http(
        `/commands/${expenseCommand.commandId}?companyId=${f.other}&family=finance.expenses`,
      )
    ).status,
  ).toBe(403);
  const invalid = await db.pool.connect();
  try {
    await invalid.query('BEGIN');
    await invalid.query('DELETE FROM finance.account_usage WHERE company_id=$1 AND account_id=$2', [
      f.company,
      cash.entityId,
    ]);
    await expect(
      invalid.query('INSERT INTO finance.account_usage VALUES($1,$2,$3)', [
        f.company,
        cash.entityId,
        f.foreign,
      ]),
    ).rejects.toThrow('foreign key');
  } finally {
    await invalid.query('ROLLBACK');
    invalid.release();
  }
});
it('database rejects negative projection, removed cash scope and immutable effect relabeling', async () => {
  await expect(
    db.pool.query('UPDATE finance.account_balance SET amount_minor=-1 WHERE account_id=$1', [
      cash.entityId,
    ]),
  ).rejects.toThrow('check constraint');
  await expect(
    db.pool.query('DELETE FROM finance.account_usage WHERE account_id=$1', [cash.entityId]),
  ).rejects.toThrow('INVALID_ACCOUNT_SCOPE');
  await expect(db.pool.query("UPDATE finance.money_movement SET reason='changed'")).rejects.toThrow(
    'IMMUTABLE_KERNEL_HISTORY',
  );
  expect(await balance()).toBe('70000');
});
it('isolated P09 seed refuses production, is repeatable and never replays historical cash', async () => {
  await expect(
    seedFinance(db.pool, f.admin.token, f.company, { a: f.a, b: f.b }, 'production'),
  ).rejects.toThrow('P09_PRODUCTION_SEED_REFUSED');
  await expect(
    seedFinance(db.pool, f.admin.token, f.company, { a: f.a, b: f.b }, 'test'),
  ).rejects.toThrow('P09_ISOLATED_COMPANY_REQUIRED');
  await db.pool.query("UPDATE access.company SET name='P09 company seed trial' WHERE id=$1", [
    f.company,
  ]);
  const before = (await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0].count;
  const first = await seedFinance(db.pool, f.admin.token, f.company, { a: f.a, b: f.b }, 'test');
  expect(await seedFinance(db.pool, f.admin.token, f.company, { a: f.a, b: f.b }, 'test')).toEqual(
    first,
  );
  expect(await balance(first.cash.entityId)).toBe('0');
  expect(await balance(first.bank.entityId)).toBe('0');
  expect((await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0].count).toBe(
    before,
  );
});
