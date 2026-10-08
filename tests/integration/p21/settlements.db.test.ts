import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { SettlementResult } from '@shahn/contracts';
import { settlementFixture, deferred, waitForBlocked } from './fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { AccountFundsService } from '../../../apps/api/src/modules/finance/accounts/service.js';
import {
  shipmentCommands,
  shipmentDetail,
} from '../../../apps/api/src/modules/shipments/service.js';
import { assertStockPreparation } from '../../../apps/api/src/modules/inventory/stock-fulfillment.js';
import { caseDetail } from '../../../apps/api/src/modules/settlements/queries.js';
import { authorityMatrix } from '../../../apps/api/src/modules/settlements/registry.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof settlementFixture>>;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await settlementFixture(db.pool);
});
afterAll(async () => {
  if (f) {
    evidence.companyId = f.company;
    evidence.authorityMatrix = authorityMatrix(f.settlements().registry);
    evidence.cases = (
      await db.pool.query(
        'SELECT id,reference,target_kind,operation,state,reason,actual_date::text FROM settlements.adjustment_case WHERE company_id=$1 ORDER BY recorded_at',
        [f.company],
      )
    ).rows;
    await writeFile(
      'docs/verification/P21/native-settlements.json',
      JSON.stringify(evidence, null, 2),
    );
  }
  await db?.dispose();
});
const reject = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as Error & { code?: string; reply?: { body: { code: string; details?: unknown } } };
  }
  throw Error('Expected rejection');
};
const code = (e: { code?: string; message: string }) => e.code ?? e.message;

it('A01 observed quantity 12→10 posts exactly one -2 movement, retains the observation and case links', async () => {
  const v = await f.product(['Single']);
  await f.receive(v.Single!, 12);
  const op = {
    operation: 'product.observe' as const,
    branchId: f.a,
    brandId: f.seed.brand,
    variantId: v.Single!,
    condition: 'sound' as const,
    observedQuantity: 10,
    actualDate: f.today,
  };
  const { preview, input, result } = await f.settle(op);
  expect(preview.facts.find((x) => x.key === 'delta')!.after).toBe('-2');
  expect(preview.effects).toEqual([expect.objectContaining({ ledger: 'stock', quantity: -2 })]);
  expect(result).toMatchObject({ state: 'resolved', classification: 'stock_observation' });
  const moves = (
    await db.pool.query(
      `SELECT m.sound_delta::int,m.unavailable_delta::int,s.kind,s.source_system FROM inventory.stock_movement m JOIN inventory.stock_source s ON(s.company_id,s.id)=(m.company_id,m.source_id)
       WHERE m.company_id=$1 AND m.variant_id=$2 ORDER BY m.recorded_at`,
      [f.company, v.Single],
    )
  ).rows;
  expect(moves).toEqual([
    { sound_delta: 12, unavailable_delta: 0, kind: 'receipt', source_system: 'erp' },
    { sound_delta: -2, unavailable_delta: 0, kind: 'adjustment', source_system: 'settlement' },
  ]);
  expect((await f.position(v.Single!)).sound).toBe(10);
  // Same command identity replays its retained result; it never posts a second movement.
  const again = (await f.settlements().confirm(f.admin.token, input)).body as SettlementResult;
  expect(again.caseId).toBe(result.caseId);
  expect(
    await f.count('inventory.stock_movement', 'company_id=$1 AND variant_id=$2', [
      f.company,
      v.Single,
    ]),
  ).toBe(2);
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'settlements', (u) =>
    caseDetail(u, f.settlements().registry, result.caseId),
  );
  expect(detail.observation).toMatchObject({
    kind: 'stock',
    recordedQuantity: 12,
    observedQuantity: 10,
    delta: -2,
  });
  expect(detail.links.map((l) => l.role).sort()).toEqual(['original', 'result']);
  evidence.A01 = { variantId: v.Single, result, moves };
});

it('A02 actual5/reserved7 keeps shortage2, holds every unhanded reservation of that variant only, then receipt2 clears holds', async () => {
  const v = await f.product(['Short', 'Other']);
  await f.receive(v.Short!, 12);
  await f.receive(v.Other!, 4);
  const first = await f.order(v.Short!, 4),
    second = await f.order(v.Short!, 3),
    unrelated = await f.order(v.Other!, 2);
  const { preview, result } = await f.settle({
    operation: 'product.observe',
    branchId: f.a,
    brandId: f.seed.brand,
    variantId: v.Short!,
    condition: 'sound',
    observedQuantity: 5,
    actualDate: f.today,
  });
  expect(preview.facts.find((x) => x.key === 'delta')!.after).toBe('-7');
  expect(preview.facts.find((x) => x.key === 'reservationShortage')!.after).toBe('2');
  expect(preview.dependents.map((d) => d.state)).toEqual(['held', 'held']);
  expect(await f.position(v.Short!)).toMatchObject({ sound: 5, reserved: 7, held: 2 });
  expect(await f.position(v.Other!)).toMatchObject({ sound: 4, reserved: 2, held: 0 });
  // Preparation of affected work is held; the unrelated variant still prepares (and dispatches).
  const blocked = await reject(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'intake', async (u) =>
      assertStockPreparation(u, await shipmentDetail(u, first.shipmentId)),
    ),
  );
  expect(code(blocked)).toBe('PREPARATION_HELD');
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'intake', async (u) =>
    assertStockPreparation(u, await shipmentDetail(u, unrelated.shipmentId)),
  );
  const prepared = await shipmentCommands(db.pool).execute(
    f.admin.token,
    f.envelope({
      type: 'shipment.prepare',
      shipmentId: unrelated.shipmentId,
      expectedVersion: unrelated.version,
    }) as never,
  );
  expect(prepared.status).toBe(200);
  // A legitimate receipt of 2 replenishes: holds recalculate, the observation record remains.
  await f.receive(v.Short!, 2);
  expect(await f.position(v.Short!)).toMatchObject({ sound: 7, reserved: 7, held: 0 });
  expect(
    await f.count('settlements.stock_observation', 'company_id=$1 AND case_id=$2', [
      f.company,
      result.caseId,
    ]),
  ).toBe(1);
  evidence.A02 = { variants: v, orders: [first, second, unrelated], result };
});

it('stale observation preview after an actual receipt fails without effects; independent-connection race orders keep both truths', async () => {
  const v = await f.product(['Race']);
  await f.receive(v.Race!, 10);
  const op = {
    operation: 'product.observe' as const,
    branchId: f.a,
    brandId: f.seed.brand,
    variantId: v.Race!,
    condition: 'sound' as const,
    observedQuantity: 8,
    actualDate: f.today,
  };
  const preview = await f.prepare(op);
  await f.receive(v.Race!, 3);
  const stale = await reject(f.settlements().confirm(f.admin.token, f.command(op, preview)));
  expect(code(stale)).toBe('SETTLEMENT_PREVIEW_STALE');
  expect((await f.position(v.Race!)).sound).toBe(13);
  expect(
    await f.count('settlements.adjustment_case', 'company_id=$1 AND target_id=$2', [
      f.company,
      v.Race,
    ]),
  ).toBe(0);
  // The rejection is retained for the same identity (recorded conflict), never applied later.
  expect(
    await f.count('command_record', "company_id=$1 AND family='settlements' AND state='rejected'"),
  ).toBeGreaterThan(0);
  // Order 1: observation holds the position lock; the competing receipt waits and lands after it.
  const fresh = await f.prepare({ ...op, observedQuantity: 11 });
  const entered = deferred(),
    release = deferred();
  const observing = f
    .settlements({
      afterLock: async () => {
        entered.resolve();
        await release.promise;
      },
    })
    .confirm(f.admin.token, f.command({ ...op, observedQuantity: 11 }, fresh));
  await entered.promise;
  const receipt = f.receive(v.Race!, 1);
  await waitForBlocked(db.pool);
  release.resolve();
  await observing;
  await receipt;
  expect((await f.position(v.Race!)).sound).toBe(12);
  // Order 2: a receipt holds the lock first; the reviewed observation then rejects as stale.
  const next = await f.prepare({ ...op, observedQuantity: 9 });
  await f.receive(v.Race!, 1);
  expect(
    code(
      await reject(
        f.settlements().confirm(f.admin.token, f.command({ ...op, observedQuantity: 9 }, next)),
      ),
    ),
  ).toBe('SETTLEMENT_PREVIEW_STALE');
  expect((await f.position(v.Race!)).sound).toBe(13);
});

it('A03 cash1000/observed900 holds100 (available900); one missed paid expense100 resolves to book900/hold0, never 800', async () => {
  const account = await f.account('خزنة ملاحظة الفرق', 'cash', [f.a]);
  await f.deposit(account, '100000');
  const observe = await f.settle({
    operation: 'account.observe',
    accountId: account,
    branchId: f.a,
    observedMinor: '90000',
    actualDate: f.today,
  });
  expect(observe.result.state).toBe('open');
  const funds = () =>
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', async (u) => {
      const s = new AccountFundsService(u);
      await s.lock([account]);
      return {
        book: String(await s.book(account)),
        held: String(await s.held(account)),
        available: String(await s.available(account)),
      };
    });
  expect(await funds()).toEqual({ book: '100000', held: '10000', available: '90000' });
  // Outward actions respect the hold: 950.00 is rejected although the book shows 1000.00.
  expect(code(await reject(f.expense(account, '95000')))).toBe('INSUFFICIENT_FUNDS');
  const resolveOp = {
    operation: 'account.resolve' as const,
    caseId: observe.result.caseId,
    resolution: {
      kind: 'missed_expense' as const,
      amountMinor: '10000',
      branchId: f.a,
      categoryId: f.category,
      description: 'مصروف مدفوع فعلًا ولم يسجل',
      method: 'cash' as const,
      actualDate: f.today,
    },
  };
  const resolved = await f.settle(resolveOp);
  expect(resolved.preview.facts.find((x) => x.key === 'availableFunds')).toMatchObject({
    before: '90000',
    after: '90000',
  });
  expect(resolved.result.state).toBe('resolved');
  expect(await funds()).toEqual({ book: '90000', held: '0', available: '90000' });
  const costs = (
    await db.pool.query(
      `SELECT c.amount_minor::text FROM finance.paid_cost c JOIN finance.paid_expense e ON(e.company_id,e.id)=(c.company_id,c.expense_id) WHERE e.company_id=$1 AND e.account_id=$2`,
      [f.company, account],
    )
  ).rows;
  expect(costs).toEqual([{ amount_minor: '10000' }]);
  // Replaying the same identity returns the same result; a different identity cannot resolve twice.
  const replay = (await f.settlements().confirm(f.admin.token, resolved.input))
    .body as SettlementResult;
  expect(replay.resolutionId).toBe(resolved.result.resolutionId);
  const twice = await reject(
    f.settlements().confirm(f.admin.token, { ...resolved.input, commandId: randomUUID() }),
  );
  expect(['SETTLEMENT_PREVIEW_STALE', 'SETTLEMENT_ALREADY_RESOLVED']).toContain(code(twice));
  expect(await funds()).toEqual({ book: '90000', held: '0', available: '90000' });
  expect(
    await f.count('finance.paid_expense', 'company_id=$1 AND account_id=$2', [f.company, account]),
  ).toBe(1);
  evidence.A03 = {
    account,
    observation: observe.result,
    resolution: resolved.result,
    funds: await funds(),
  };
});

it('rolling comparison: a later genuine expense changes book while the hold amount stays; a surplus is never spendable', async () => {
  const account = await f.account('خزنة المقارنة المتحركة', 'cash', [f.a]);
  await f.deposit(account, '100000');
  const observe = await f.settle({
    operation: 'account.observe',
    accountId: account,
    branchId: f.a,
    observedMinor: '90000',
    actualDate: f.today,
  });
  await f.expense(account, '5000');
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'settlements', (u) =>
    caseDetail(u, f.settlements().registry, observe.result.caseId),
  );
  expect(detail.observation).toMatchObject({
    kind: 'account',
    bookAtObservationMinor: '100000',
    observedMinor: '90000',
    holdActiveMinor: '10000',
    bookNowMinor: '95000',
    estimatedActualMinor: '85000',
    availableNowMinor: '85000',
  });
  // A second observation while one is open is blocked rather than overwriting the first.
  const second = await f.prepare({
    operation: 'account.observe',
    accountId: account,
    branchId: f.a,
    observedMinor: '1',
    actualDate: f.today,
  });
  expect(second.blockers).toContain('ACCOUNT_OBSERVATION_OPEN');
  // Explicit company loss resolution: one payment, no operating fact, outside profit.
  const loss = await f.settle({
    operation: 'account.resolve',
    caseId: observe.result.caseId,
    resolution: { kind: 'company_loss', amountMinor: '10000', branchId: f.a, actualDate: f.today },
  });
  expect(loss.result.classification).toBe('company_loss_unclassified');
  expect(loss.preview.warnings).toContain('UNCLASSIFIED_OUTSIDE_OPERATING_PROFIT');
  expect(await f.balance(account)).toBe('85000');
  expect(
    await f.count(
      'kernel.journal_effect',
      "company_id=$1 AND source_id=(SELECT source_id FROM settlements.resolution WHERE company_id=$1 AND id=$2) AND family='operating'",
      [f.company, loss.result.resolutionId],
    ),
  ).toBe(0);
  // Positive observation: retained, no hold, no spendable funds until a typed missed deposit.
  const surplus = await f.account('خزنة فائض', 'cash', [f.a]);
  await f.deposit(surplus, '10000');
  const up = await f.settle({
    operation: 'account.observe',
    accountId: surplus,
    branchId: f.a,
    observedMinor: '15000',
    actualDate: f.today,
  });
  expect(up.preview.warnings).toContain('POSITIVE_OBSERVATION_NOT_SPENDABLE');
  expect(await f.balance(surplus)).toBe('10000');
  const bad = await f.prepare({
    operation: 'account.resolve',
    caseId: up.result.caseId,
    resolution: { kind: 'company_loss', amountMinor: '5000', branchId: f.a, actualDate: f.today },
  });
  expect(bad.blockers).toContain('RESOLUTION_KIND_NOT_LAWFUL');
  const deposit = await f.settle({
    operation: 'account.resolve',
    caseId: up.result.caseId,
    resolution: {
      kind: 'missed_movement',
      amountMinor: '5000',
      branchId: f.a,
      method: 'cash',
      actualDate: f.today,
    },
  });
  expect(deposit.result.state).toBe('resolved');
  expect(await f.balance(surplus)).toBe('15000');
});

it('A04 a paid payroll month offers no edit path; current-unpaid additions go through P20 only', async () => {
  const e = await f.employee('موظف شهر مدفوع');
  const month = f.now.today.slice(0, 7);
  await f.deposit(f.cash, '1000000');
  const add = await f.settle({
    operation: 'employee.adjust',
    employeeId: e.employeeId,
    month,
    kind: 'bonus',
    amountMinor: '20000',
    workDate: f.now.today,
  });
  expect(add.preview.facts.find((x) => x.key === 'netPayable')).toMatchObject({
    before: '600000',
    after: '620000',
  });
  expect(add.result.classification).toBe('payroll_addition');
  const { payrollCommands, payrollMonth } =
    await import('../../../apps/api/src/modules/employees/payroll.service.js');
  const p = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', (u) =>
    payrollMonth(u, e.employeeId, month, f.payrollClock),
  );
  await payrollCommands(db.pool, {}, f.payrollClock).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    employeeId: e.employeeId,
    month,
    expectedVersion: p.version,
    expectedDigest: p.digest,
    type: 'payroll.payout',
    funding: {
      accountId: f.cash,
      branchId: f.a,
      method: 'cash',
      actualDate: f.now.today,
      reference: 'P21',
    },
  });
  const op = {
    operation: 'employee.adjust' as const,
    employeeId: e.employeeId,
    month,
    kind: 'bonus' as const,
    amountMinor: '1000',
    workDate: f.now.today,
  };
  const preview = await f.prepare(op);
  expect(preview.blockers).toContain('PAYROLL_PERIOD_PROTECTED');
  const before = await f.count('employees.payroll_adjustment', 'company_id=$1 AND employee_id=$2', [
    f.company,
    e.employeeId,
  ]);
  const rejected = await reject(f.settlements().confirm(f.admin.token, f.command(op, preview)));
  expect(code(rejected)).toBe('PAYROLL_PERIOD_PROTECTED');
  expect(
    await f.count('employees.payroll_adjustment', 'company_id=$1 AND employee_id=$2', [
      f.company,
      e.employeeId,
    ]),
  ).toBe(before);
  evidence.A04 = { employeeId: e.employeeId, month, rejected: code(rejected) };
});

it('A06 opening batch: Cash500, eligible brand200, employee obligation100, stock3; replay once; duplicate targets rejected', async () => {
  const v = await f.product(['Opening']);
  const account = await f.account('خزنة افتتاحية', 'cash', [f.a]);
  const e = await f.employee('موظف رصيد افتتاحي');
  const month = f.now.today.slice(0, 7);
  const lines = [
    {
      classification: 'account_balance' as const,
      accountId: account,
      branchId: f.a,
      amountMinor: '50000',
    },
    {
      classification: 'brand_eligible_credit' as const,
      brandId: f.seed.brand,
      branchId: f.a,
      amountMinor: '20000',
    },
    {
      classification: 'employee_obligation' as const,
      employeeId: e.employeeId,
      branchId: f.a,
      month,
      amountMinor: '10000',
    },
    {
      classification: 'stock_sound' as const,
      brandId: f.seed.brand,
      variantId: v.Opening!,
      branchId: f.a,
      quantity: 3,
    },
  ];
  const service = f.openings();
  const preview = await service.prepare(f.admin.token, {
    companyId: f.company,
    openingDate: f.today,
    lines,
  });
  expect(preview.blockers).toEqual([]);
  expect(preview.totals).toMatchObject({
    moneyMinor: '50000',
    brandEligibleMinor: '20000',
    employeeObligationMinor: '10000',
    stockQuantity: 3,
  });
  const input = f.openingCommand(lines, preview);
  const operatingBefore = await f.count(
    'kernel.journal_effect',
    "company_id=$1 AND family='operating'",
  );
  const first = await service.confirm(f.admin.token, input);
  const second = await service.confirm(f.admin.token, input);
  expect(second.body).toEqual(first.body);
  expect(await f.count('settlements.opening_line', 'company_id=$1', [f.company])).toBe(4);
  expect(await f.balance(account)).toBe('50000');
  expect((await f.position(v.Opening!)).sound).toBe(3);
  expect(await f.count('kernel.journal_effect', "company_id=$1 AND family='operating'")).toBe(
    operatingBefore,
  );
  const effects = (
    await db.pool.query(
      `SELECT e.family,e.kind,e.amount_minor::text FROM kernel.journal_effect e JOIN settlements.opening_line l ON(l.company_id,l.effect_id)=(e.company_id,e.id) WHERE l.company_id=$1 ORDER BY l.line_number`,
      [f.company],
    )
  ).rows;
  expect(effects).toEqual([
    { family: 'money', kind: 'opening', amount_minor: '50000' },
    { family: 'brand', kind: 'opening', amount_minor: '20000' },
    { family: 'employee', kind: 'opening', amount_minor: '-10000' },
  ]);
  // Employee obligation becomes one ordinary P20 original recoverable from the month (no cash).
  const { payrollMonth } =
    await import('../../../apps/api/src/modules/employees/payroll.service.js');
  const p = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', (u) =>
    payrollMonth(u, e.employeeId, month, f.payrollClock),
  );
  expect(p.obligations).toEqual([
    expect.objectContaining({ kind: 'settlement', amountMinor: '10000' }),
  ]);
  expect(p.calculation).toMatchObject({
    netPayable: '590000',
    employeeCost: '600000',
    settlementRecovered: '10000',
  });
  // A different identity for an already opened target is rejected atomically.
  const again = await service.prepare(f.admin.token, {
    companyId: f.company,
    openingDate: f.today,
    lines: [lines[0]!],
  });
  expect(again.blockers).toContain('DUPLICATE_OPENING_TARGET');
  const dup = await reject(service.confirm(f.admin.token, f.openingCommand([lines[0]!], again)));
  expect(code(dup)).toBe('DUPLICATE_OPENING_TARGET');
  expect(await f.balance(account)).toBe('50000');
  // Unresolved driver-held brand money entered separately stays pending, never payout-ready.
  const pendingLines = [
    {
      classification: 'brand_pending_driver_held' as const,
      brandId: f.seed.brand,
      branchId: f.a,
      amountMinor: '7000',
    },
  ];
  const pending = await service.prepare(f.admin.token, {
    companyId: f.company,
    openingDate: f.today,
    lines: pendingLines,
  });
  await service.confirm(f.admin.token, f.openingCommand(pendingLines, pending));
  const { BrandWalletService } =
    await import('../../../apps/api/src/modules/finance/brand-wallet/wallet.service.js');
  const wallet = await UnitOfWork.run(
    db.pool,
    f.admin.token,
    f.company,
    'brand.payout',
    async (u) => {
      await BrandWalletService.lock(u, [f.seed.brand]);
      return new BrandWalletService(u, f.seed.brand).amounts();
    },
  );
  expect(wallet).toMatchObject({
    eligibleMinor: '20000',
    pendingMinor: '7000',
    eligibleToPayMinor: '20000',
  });
  evidence.A06 = { batch: first.body, wallet, payroll: p.calculation };
});

it('two different opening commands for the same target race on independent connections; exactly one posts', async () => {
  const account = await f.account('خزنة سباق الافتتاح', 'cash', [f.a]);
  const lines = [
    {
      classification: 'account_balance' as const,
      accountId: account,
      branchId: f.a,
      amountMinor: '1000',
    },
  ];
  const preview = await f
    .openings()
    .prepare(f.admin.token, { companyId: f.company, openingDate: f.today, lines });
  const entered = deferred(),
    release = deferred();
  const first = f
    .openings({
      afterLock: async () => {
        entered.resolve();
        await release.promise;
      },
    })
    .confirm(f.admin.token, f.openingCommand(lines, preview));
  await entered.promise;
  const second = f
    .openings()
    .confirm(f.admin.token, f.openingCommand(lines, preview))
    .catch((e) => e);
  await waitForBlocked(db.pool);
  release.resolve();
  await first;
  expect(code(await second)).toBe('DUPLICATE_OPENING_TARGET');
  expect(await f.balance(account)).toBe('1000');
  expect(
    await f.count('settlements.opening_line', 'company_id=$1 AND account_id=$2', [
      f.company,
      account,
    ]),
  ).toBe(1);
});

it('fault injection after each settlement stage leaves no partial stock, money, case, link or audit result', async () => {
  const v = await f.product(['Fault']);
  await f.receive(v.Fault!, 6);
  const account = await f.account('خزنة الأعطال', 'cash', [f.a]);
  await f.deposit(account, '20000');
  const snapshot = async () => ({
    cases: await f.count('settlements.adjustment_case'),
    resolutions: await f.count('settlements.resolution'),
    links: await f.count('settlements.case_link'),
    movements: await f.count('inventory.stock_movement'),
    money: await f.count('finance.money_movement'),
    holds: await f.count('settlements.account_hold'),
    audit: await f.count('audit_entry'),
    sound: (await f.position(v.Fault!)).sound,
    balance: await f.balance(account),
  });
  for (const stage of ['recorded', 'effects', 'links', 'result'] as const) {
    const before = await snapshot();
    for (const op of [
      {
        operation: 'product.observe' as const,
        branchId: f.a,
        brandId: f.seed.brand,
        variantId: v.Fault!,
        condition: 'sound' as const,
        observedQuantity: 4,
        actualDate: f.today,
      },
      {
        operation: 'account.observe' as const,
        accountId: account,
        branchId: f.a,
        observedMinor: '15000',
        actualDate: f.today,
      },
    ]) {
      const preview = await f.prepare(op);
      const service = f.settlements({
        fault: async (at) => {
          if (at === stage) throw Error('INJECTED_' + stage);
        },
      });
      await expect(service.confirm(f.admin.token, f.command(op, preview))).rejects.toThrow(
        'INJECTED_' + stage,
      );
    }
    expect(await snapshot()).toEqual(before);
  }
  for (const stage of ['batch', 'money', 'stock', 'result'] as const) {
    const lines = [
      {
        classification: 'account_balance' as const,
        accountId: await f.account('خزنة عطل الافتتاح ' + stage, 'cash', [f.a]),
        branchId: f.a,
        amountMinor: '100',
      },
      {
        classification: 'stock_unavailable' as const,
        brandId: f.seed.brand,
        variantId: v.Fault!,
        branchId: f.a,
        quantity: 1,
      },
    ];
    const before = {
      lines: await f.count('settlements.opening_line'),
      money: await f.count('finance.money_movement'),
      moves: await f.count('inventory.stock_movement'),
    };
    const preview = await f
      .openings()
      .prepare(f.admin.token, { companyId: f.company, openingDate: f.today, lines });
    await expect(
      f
        .openings({
          fault: async (at) => {
            if (at === stage) throw Error('INJECTED_' + stage);
          },
        })
        .confirm(f.admin.token, f.openingCommand(lines, preview)),
    ).rejects.toThrow('INJECTED_' + stage);
    expect({
      lines: await f.count('settlements.opening_line'),
      money: await f.count('finance.money_movement'),
      moves: await f.count('inventory.stock_movement'),
    }).toEqual(before);
  }
});

it('A08 missing, out-of-scope or unsupported targets reject atomically without a case', async () => {
  const before = await f.count('settlements.adjustment_case');
  // Unknown brand movement.
  expect(
    code(
      await reject(
        f.prepare({
          operation: 'brand.correct',
          brandId: f.seed.brand,
          effectId: randomUUID(),
          amountMinor: '-100',
          actualDate: f.today,
        }),
      ),
    ),
  ).toBe('NOT_FOUND');
  // Staff role without the inventory/settlements grants and a branch-B-only user.
  expect(
    code(
      await reject(
        f.prepare(
          {
            operation: 'account.observe',
            accountId: f.cash,
            branchId: f.a,
            observedMinor: '1',
            actualDate: f.today,
          },
          f.staffA.token,
        ),
      ),
    ),
  ).toBe('FORBIDDEN_SCOPE');
  // Injected field / unknown operation never reaches a resolver.
  expect(
    code(
      await reject(
        f.settlements().prepare(f.admin.token, {
          companyId: f.company,
          operation: { operation: 'ledger.edit', table: 'kernel.journal_effect' } as never,
        }),
      ),
    ),
  ).toBe('VALIDATION_FAILED');
  // Out-of-scope branch: a branch-B-only user cannot observe a branch-A account even with grants.
  await db.pool.query(
    "INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'settlements'),($1,$2,'finance.accounts') ON CONFLICT DO NOTHING",
    [f.company, f.staffRole],
  );
  expect(
    code(
      await reject(
        f.prepare(
          {
            operation: 'account.observe',
            accountId: f.cash,
            branchId: f.a,
            observedMinor: '1',
            actualDate: f.today,
          },
          f.staffB.token,
        ),
      ),
    ),
  ).toBe('FORBIDDEN_SCOPE');
  await db.pool.query(
    "DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability IN ('settlements','finance.accounts')",
    [f.company, f.staffRole],
  );
  // A cancelled (or departed/integrated) parcel has no rewrite path: the preview blocks and
  // confirmation rejects without a settlement case.
  const v = await f.product(['Cancelled']);
  await f.receive(v.Cancelled!, 2);
  const s = await f.order(v.Cancelled!, 1);
  const first = await f.settle({ operation: 'parcel.cancel', shipmentId: s.shipmentId });
  expect(first.result.classification).toBe('parcel_cancellation');
  const blocked = await f.prepare({ operation: 'parcel.cancel', shipmentId: s.shipmentId });
  expect(blocked.blockers).toContain('SHIPMENT_CANCELLED');
  const after = await f.count('settlements.adjustment_case');
  expect(
    code(
      await reject(
        f
          .settlements()
          .confirm(
            f.admin.token,
            f.command({ operation: 'parcel.cancel', shipmentId: s.shipmentId }, blocked),
          ),
      ),
    ),
  ).toBe('SHIPMENT_CANCELLED');
  expect(await f.count('settlements.adjustment_case')).toBe(after);
  expect(after).toBe(before + 1);
});
