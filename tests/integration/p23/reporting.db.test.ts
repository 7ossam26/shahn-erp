import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, migrationStatus, readMigrations } from '@shahn/database';
import type { ExportCommand, ExportJob } from '@shahn/contracts';
import { reportFixture } from './fixtures.js';
import { settlementFixture } from '../p21/fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import {
  ExportWorker,
  exportCommands,
  exportJob,
  downloadExport,
} from '../../../apps/api/src/modules/reporting/exports.js';
import { ReportingService } from '../../../apps/api/src/modules/reporting/service.js';
import { queryPlan } from '../../../apps/api/src/modules/reporting/read-services.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof reportFixture>>;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await reportFixture(db.pool);
}, 120000);
afterAll(async () => {
  await mkdir('docs/verification/P23', { recursive: true });
  await writeFile(
    'docs/verification/P23/reporting-database.json',
    JSON.stringify(evidence, null, 2),
  );
  await f?.close();
  await db?.dispose();
}, 120000);
const readJob = (id: string, token = f.admin.token) =>
  UnitOfWork.run(db.pool, token, f.company, 'reports', (u) => exportJob(u, id));
const download = (id: string, token = f.admin.token) =>
  UnitOfWork.run(db.pool, token, f.company, 'reports', (u) => downloadExport(u, id));
const exportInput = (
  snapshotId: string,
  filterDigest: string,
  format: 'xlsx' | 'pdf' = 'xlsx',
): ExportCommand => ({
  schemaVersion: 1,
  commandId: randomUUID(),
  companyId: f.company,
  type: 'report.export',
  snapshotId,
  filterDigest,
  format,
});
it('cash positions keep unresolved negative and positive observations separate from posted balances', async () => {
  const observationDb = await isolatedPostgres();
  await migrate(observationDb.pool);
  const observed = await settlementFixture(observationDb.pool);
  try {
    const shortage = await observed.settle({
      operation: 'account.observe',
      accountId: observed.cash,
      branchId: observed.a,
      observedMinor: '90000',
      actualDate: observed.today,
    });
    const service = new ReportingService(observationDb.pool);
    const input = {
      schemaVersion: 1 as const,
      type: 'report.snapshot' as const,
      commandId: randomUUID(),
      companyId: observed.company,
      reportId: 'REP-12' as const,
      filters: { branchIds: [observed.a], accountIds: [observed.cash] },
      sort: 'dateAsc' as const,
    };
    const snapshot = (await service.create(observed.admin.token, input)).snapshot;
    expect(snapshot.context['accounts']).toEqual([
      expect.objectContaining({ bookMinor: '100000', heldMinor: '10000', availableMinor: '90000' }),
    ]);
    expect(snapshot.context['discrepancies']).toEqual([
      expect.objectContaining({
        caseId: shortage.result.caseId,
        observedMinor: '90000',
        differenceMinor: '-10000',
      }),
    ]);
    expect(snapshot.totals['amountMinor']).toBe('100000');
    const surplusAccount = await observed.account('P23 حساب فائض', 'cash', [observed.a]);
    await observed.deposit(surplusAccount, '10000');
    await observed.settle({
      operation: 'account.observe',
      accountId: surplusAccount,
      branchId: observed.a,
      observedMinor: '15000',
      actualDate: observed.today,
    });
    const surplus = (
      await service.create(observed.admin.token, {
        ...input,
        commandId: randomUUID(),
        filters: { branchIds: [observed.a], accountIds: [surplusAccount] },
      })
    ).snapshot;
    expect(surplus.context['accounts']).toEqual([
      expect.objectContaining({ bookMinor: '10000', heldMinor: '0', availableMinor: '10000' }),
    ]);
    expect(surplus.context['discrepancies']).toEqual([
      expect.objectContaining({ differenceMinor: '5000' }),
    ]);
    expect(surplus.totals['amountMinor']).toBe('10000');
    evidence.discrepancies = { snapshot, surplus };
  } finally {
    await observationDb.dispose();
  }
});
it('A01 money trial reconciles 700/300 cash, 150 eligible, 100 payout, 200 paid expense from independent journals', async () => {
  expect((await migrationStatus(db.pool, await readMigrations())).state).toBe('current');
  expect(await f.balance(f.aCash)).toBe('70000');
  expect(await f.balance(f.bCash)).toBe('30000');
  const expenses = await f.report('REP-14', { branchIds: [f.a], from: f.today, to: f.today });
  expect(expenses.snapshot.totals['amountMinor']).toBe('20000');
  expect(expenses.rows[0]!.sourceIds.length).toBe(3);
  const dues = await f.report('REP-09', { brandIds: [f.brand] });
  expect(dues.snapshot.totals['eligibleMinor']).toBe('15000');
  expect(dues.rows[0]!.values['paidMinor']).toBe('10000');
  const history = await f.report('REP-10', { brandIds: [f.brand] });
  expect(history.snapshot.totals['amountMinor']).toBe('10000');
  const statement = await f.report('REP-08', { brandIds: [f.brand] });
  expect(statement.snapshot.totals['amountMinor']).toBe('15000');
  const cash = await f.report('REP-12', { accountIds: [f.aCash, f.bCash] });
  expect(cash.snapshot.totals['amountMinor']).toBe('100000');
  const oracle = (
    await db.pool.query(
      `SELECT e.id::text,e.amount_minor::text FROM kernel.journal_effect e WHERE company_id=$1 AND family='money' AND subject_id=ANY($2::uuid[]) ORDER BY id`,
      [f.company, [f.aCash, f.bCash]],
    )
  ).rows;
  expect(cash.rows.map((r) => r.sourceIds[1]).sort()).toEqual(oracle.map((r) => r.id).sort());
  expect(oracle.reduce((s, r) => s + BigInt(r.amount_minor), 0n).toString()).toBe(
    cash.snapshot.totals['amountMinor'],
  );
  expect(cash.rows.some((r) => r.values['kind'] === 'general')).toBe(true);
  expect(cash.rows.filter((r) => r.values['kind']?.includes('treasury')).length).toBe(2);
  evidence.moneyTrial = {
    companyId: f.company,
    aCash: '70000',
    bCash: '30000',
    expenses,
    dues,
    history,
    statement,
    cash,
    oracle,
  };
});
it('A05 27 rows paginate25+2, Arabic digits find references, export every row and literal formula-like text', async () => {
  const p = await f.report('REP-01', { search: 'P23-REGISTER-' });
  expect(p.snapshot.totalRows).toBe(27);
  expect(p.rows).toHaveLength(25);
  const second = await f.reporting.page(f.admin.token, f.company, p.snapshot.id, 2);
  expect(second.rows).toHaveLength(2);
  expect(new Set([...p.rows, ...second.rows].map((r) => r.id)).size).toBe(27);
  const input = exportInput(p.snapshot.id, p.snapshot.filterDigest),
    job = (await exportCommands(db.pool).execute(f.admin.token, input)).body as ExportJob;
  expect((await readJob(job.id)).downloadUrl).toBeNull();
  await expect(download(job.id)).rejects.toThrow('EXPORT_NOT_READY');
  await new ExportWorker(db.pool).runOne();
  const a = await download(job.id);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(a.bytes!).buffer);
  const sheet = workbook.getWorksheet('التقرير')!;
  expect(sheet.rowCount).toBe(35);
  expect(sheet.getRow(8).getCell(1).type).toBe(ExcelJS.ValueType.String);
  const identifiers = Array.from({ length: 27 }, (_, i) =>
    String(sheet.getRow(8 + i).getCell(1).value),
  );
  expect(new Set(identifiers).size).toBe(27);
  const expense = await f.report('REP-14', { branchIds: [f.a] });
  const ej = (
    await exportCommands(db.pool).execute(
      f.admin.token,
      exportInput(expense.snapshot.id, expense.snapshot.filterDigest),
    )
  ).body as ExportJob;
  await new ExportWorker(db.pool).runOne();
  const ea = await download(ej.id);
  const eb = new ExcelJS.Workbook();
  await eb.xlsx.load(Uint8Array.from(ea.bytes!).buffer);
  expect(eb.getWorksheet('التقرير')!.getCell('E8').value).toBe(
    "'=SUM(A1:A2) مصروف P23 طويل لا ينفذ معادلة",
  );
  expect(eb.getWorksheet('التقرير')!.getCell('F8').value).toBe('200.00');
  await writeFile('docs/verification/P23/shipments-27.xlsx', a.bytes!);
  await writeFile('docs/verification/P23/expenses-200.xlsx', ea.bytes!);
  evidence.fullExport = {
    snapshot: p.snapshot,
    rows: identifiers,
    artifact: job.id,
    sha256: a.sha256,
  };
});
it('A02/03/07 report scope and download reauthorize, tracking alone cannot query/create/export', async () => {
  await expect(f.report('REP-01', { branchIds: [f.b] }, f.reportA.token)).rejects.toThrow(
    'FORBIDDEN_SCOPE',
  );
  await expect(f.report('REP-01', {}, f.trackingOnly.token)).rejects.toThrow('FORBIDDEN_SCOPE');
  const p = await f.report('REP-14', { branchIds: [f.a] }, f.reportA.token),
    input = exportInput(p.snapshot.id, p.snapshot.filterDigest),
    c = exportCommands(db.pool);
  await expect(c.execute(f.trackingOnly.token, input)).rejects.toThrow('FORBIDDEN_SCOPE');
  const job = (await c.execute(f.reportA.token, input)).body as ExportJob;
  await new ExportWorker(db.pool).runOne();
  expect((await download(job.id, f.reportA.token)).bytes!.length).toBeGreaterThan(100);
  await db.pool.query(
    `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='reports'`,
    [f.company, f.scopedRole],
  );
  await expect(download(job.id, f.reportA.token)).rejects.toThrow('FORBIDDEN_SCOPE');
  await expect(c.execute(f.reportA.token, input)).rejects.toThrow('FORBIDDEN_SCOPE');
  await db.pool.query(`INSERT INTO access.role_grant VALUES($1,$2,'reports')`, [
    f.company,
    f.scopedRole,
  ]);
  await db.pool.query(
    `DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2 AND branch_id=$3`,
    [f.company, f.reportA.id, f.a],
  );
  await expect(download(job.id, f.reportA.token)).rejects.toThrow('FORBIDDEN_SCOPE');
  await db.pool.query(`INSERT INTO access.user_branch VALUES($1,$2,$3)`, [
    f.company,
    f.reportA.id,
    f.a,
  ]);
});
it('A09 independent late/backdated commit during snapshot read cannot change its rows or totals; explicit refresh sees it', async () => {
  const input = f.command('REP-14', { branchIds: [f.a], from: f.today, to: f.today });
  let inserted = false;
  let reached!: () => void, release!: () => void;
  const atRead = new Promise<void>((r) => {
      reached = r;
    }),
    continueRead = new Promise<void>((r) => {
      release = r;
    });
  const service = new ReportingService(db.pool, {
    afterSourceRead: async () => {
      reached();
      await continueRead;
    },
  });
  const other = await f.make('p23-concurrent-writer', [f.a], f.adminRole);
  const pending = service.create(f.admin.token, input);
  await atRead;
  try {
    await f.expense('1000', f.today, f.a, 'P23 late entry', other.token);
    inserted = true;
  } finally {
    release();
  }
  const old = await pending;
  expect(inserted).toBe(true);
  expect(old.snapshot.totals['amountMinor']).toBe('20000');
  expect(old.snapshot.totalRows).toBe(1);
  const fresh = await f.report('REP-14', input.filters);
  expect(fresh.snapshot.totals['amountMinor']).toBe('21000');
  expect(fresh.snapshot.totalRows).toBe(2);
  expect(
    (await f.reporting.page(f.admin.token, f.company, old.snapshot.id)).snapshot.dataDigest,
  ).toBe(old.snapshot.dataDigest);
  const again = await service.create(f.admin.token, input);
  expect(again.snapshot.id).toBe(old.snapshot.id);
  await expect(service.create(f.admin.token, { ...input, sort: 'dateDesc' })).rejects.toThrow(
    'COMMAND_PAYLOAD_CONFLICT',
  );
  evidence.concurrentSnapshot = { old: old.snapshot, fresh: fresh.snapshot };
});
it('snapshot source query plans retain company/branch/date predicates and stable tie breakers', async () => {
  const plans: Record<string, unknown> = {};
  for (const id of [
    'REP-01',
    'REP-05',
    'REP-07',
    'REP-08',
    'REP-10',
    'REP-12',
    'REP-14',
    'REP-18',
  ] as const) {
    const p = queryPlan(
      id,
      f.company,
      [f.a],
      id === 'REP-18' ? {} : { from: f.today, to: f.today },
      'dateAsc',
    );
    plans[id] = (
      await db.pool.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + p.sql, p.args)
    ).rows;
  }
  evidence.queryPlans = plans;
});
it('inclusive integer bounds combine OR selections with AND fields; equal actual dates paginate deterministically and backdated expense stays in its actual period', async () => {
  const yesterday = new Date(f.today + 'T12:00:00Z');
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const earlier = yesterday.toISOString().slice(0, 10);
  await f.expense('6000', earlier, f.a, 'P23 genuine backdated entry');
  const old = await f.report('REP-14', {
    branchIds: [f.a, f.b],
    categoryIds: [f.category],
    from: earlier,
    to: earlier,
    minMinor: '6000',
    maxMinor: '6000',
  });
  expect(old.snapshot.totals['amountMinor']).toBe('6000');
  expect(old.rows).toHaveLength(1);
  expect(old.rows[0]!.effectiveAt!.slice(0, 10)).not.toBe(old.rows[0]!.recordedAt!.slice(0, 10));
  const r = await f.report('REP-14', { from: f.today, to: f.today });
  expect(r.snapshot.totalRows).toBe(2);
  expect(r.rows[0]!.values['date']).toBe(r.rows[1]!.values['date']);
  const again = await f.reporting.page(f.admin.token, f.company, r.snapshot.id);
  expect(again.rows.map((x) => x.id)).toEqual(r.rows.map((x) => x.id));
  evidence.backdated = { actualPeriod: old, entryPeriod: r };
});
it('prepaid zero-goods delivery adds no goods credit, pending dues stay separate, current delivered parcel is not carrier stock; reporting cannot reprice its source', async () => {
  const brand = await f.createBrand('P23 مسبق الدفع'),
    cycle = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '0' }]);
  const before = (
    await db.pool.query(
      `SELECT snapshot FROM shipments.price_snapshot WHERE company_id=$1 ORDER BY shipment_id,revision`,
      [f.company],
    )
  ).rows;
  const dues = await f.report('REP-09', { brandIds: [brand] });
  expect(dues.snapshot.totals['pendingMinor']).toBe('0');
  expect(dues.snapshot.totals['eligibleMinor']).toBe('0');
  const statement = await f.report('REP-08', { brandIds: [brand] });
  expect(statement.rows.some((r) => BigInt(r.values['amountMinor']!) > 0n)).toBe(false);
  const stock = await f.report('REP-18', { brandIds: [brand] });
  expect(stock.snapshot.context['parcelTotals']).toEqual({ onHand: '0', carrier: '0' });
  await f.report('REP-01', { brandIds: [brand] });
  expect(
    (
      await db.pool.query(
        `SELECT snapshot FROM shipments.price_snapshot WHERE company_id=$1 ORDER BY shipment_id,revision`,
        [f.company],
      )
    ).rows,
  ).toEqual(before);
  evidence.prepaid = { round: cycle.round.roundId, dues, statement, stock };
});
it('A09 accepted late correction keeps original/current source outcomes distinct and old register snapshot coherent without a second visit', async () => {
  const x = await f.received({
    brandReference: 'P23-CORRECTION',
    lines: [
      {
        id: randomUUID(),
        description: 'قطعتان',
        quantity: 2,
        unitDue: { currency: 'EGP', amountMinor: '12500' },
      },
    ],
  });
  const drain = async () => {
    for (let n = 0; n < 20; n++) if (!(await f.worker.runOne())) break;
  };
  await f.receive(x.arrival());
  await drain();
  const o = await x.outcome('full');
  await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 2));
  await drain();
  const old = await f.report('REP-01', { search: 'P23-CORRECTION' });
  const revised = structuredClone(o);
  revised.outcome = 'partial';
  revised.outcomeId = randomUUID();
  revised.revision = 2;
  revised.returnRequired = true;
  revised.lines[0]!.delivered = 1;
  revised.lines[0]!.heldReturnRequired = 1;
  revised.collection.goods.amountMinor = 12500;
  revised.collection.reported!.amountMinor = 17500;
  revised.time = f.time();
  await f.receive(
    f.event(
      'outcome.corrected',
      {
        correction: {
          correctionId: randomUUID(),
          previousOutcomeId: o.outcomeId,
          previousRevision: 1,
          outcome: revised,
          evidenceActionId: null,
          evidenceReceiptId: null,
        },
        previousOutcome: o,
      },
      x.task.taskId,
      3,
    ),
  );
  await drain();
  const fresh = await f.report('REP-01', { search: 'P23-CORRECTION' });
  expect(fresh.rows[0]!.values).toMatchObject({
    originalOutcome: 'full',
    effectiveOutcome: 'partial',
    execution: 'partial',
    custody: 'driver',
  });
  expect(
    (await f.reporting.page(f.admin.token, f.company, old.snapshot.id)).rows[0]!.values[
      'execution'
    ],
  ).toBe('full');
  const activity = await f.report('REP-05', { driverIds: [f.driver] });
  expect(
    activity.rows.filter(
      (r) => r.values['kind'] === 'visit' && r.sourceIds.includes(x.s.shipmentId),
    ),
  ).toHaveLength(1);
  evidence.lateCorrection = { old, fresh };
});
it('persisted checkpoint gap stays visibly incomplete in cash and current stock snapshots; native paid expenses remain independently complete', async () => {
  // Inject only the read-model coverage boundary; no money/custody/source facts are fabricated.
  // P13/P22 prerequisite suites separately prove real out-of-order receipt/apply behavior.
  await db.pool.query(
    'UPDATE integration.checkpoint SET received_high=received_high+1 WHERE company_id=$1',
    [f.company],
  );
  const cash = await f.report('REP-12', { accountIds: [f.aCash] });
  const stock = await f.report('REP-18');
  for (const page of [cash, stock]) {
    expect(page.snapshot.coverage.complete).toBe(false);
    expect(page.snapshot.coverage.flags).toContain('SOURCE_HISTORY_INCOMPLETE');
    expect(page.snapshot.coverage.flags).toContain('SOURCE_FINANCIAL_READINESS_PENDING');
  }
  expect((await f.report('REP-14')).snapshot.coverage.complete).toBe(true);
  evidence.gapSnapshots = { cash, stock };
});
