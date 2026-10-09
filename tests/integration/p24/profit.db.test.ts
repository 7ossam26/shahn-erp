import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { mkdir, writeFile } from 'node:fs/promises';
import { profitFixture, type ProfitFixture } from './fixtures.js';
import { reportingResponseValidators, type ProfitSummary } from '@shahn/contracts';
import type {
  ExportCommand,
  FinanceCommand,
  ExportJob,
  ProfitActualMoney,
  ProfitReconciliationFinding,
  SettlementCommand,
  SettlementOperation,
} from '@shahn/contracts';
import ExcelJS from 'exceljs';
import { ReportingService, snapshotRows } from '../../../apps/api/src/modules/reporting/service.js';
import { profitEffectsSql } from '../../../apps/api/src/modules/reporting/profit-sources.js';
import { SettlementService } from '../../../apps/api/src/modules/settlements/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { rebuildAccountProjection } from '../../../apps/api/src/modules/finance/accounts/rebuild.js';
import {
  exportCommands,
  ExportWorker,
  downloadExport,
} from '../../../apps/api/src/modules/reporting/exports.js';
import { deferred, offsetMonth } from '../p20/fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: ProfitFixture;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await profitFixture(db.pool);
}, 120000);
afterAll(async () => {
  await mkdir('docs/verification/P24', { recursive: true });
  await writeFile('docs/verification/P24/profit-database.json', JSON.stringify(evidence, null, 2));
  await db?.dispose();
}, 120000);
it('A01 real visits/storage/payroll/expense/incident reproduce profit6200 and drill into immutable sources', async () => {
  const r = await f.report();
  evidence['A01'] = r;
  expect(
    reportingResponseValidators.page(r),
    JSON.stringify(reportingResponseValidators.page.errors),
  ).toBe(true);
  const p = r.snapshot.context['profit'] as ProfitSummary;
  expect(p.profitMinor).toBe('620000');
  expect(p.calculationComplete).toBe(true);
  expect(p.shipping.grossMinor).toBe('1000000');
  expect(p.payroll.employeeCostMinor).toBe('400000');
  expect(p.branches.reduce((n, b) => n + BigInt(b.profitMinor), 0n).toString()).toBe(p.profitMinor);
  for (const c of p.categories.filter((c) => c.sourceCount)) {
    const detail = await f.reporting.category(f.admin.token, f.company, r.snapshot.id, c.category);
    expect(
      detail.rows.reduce((n, row) => n + BigInt(row.values['amountMinor']!), 0n).toString(),
    ).toBe(c.amountMinor);
    for (const row of detail.rows) expect(row.economicEffect?.sourceId).toBeTruthy();
  }
});
it('A01 generic deposit, transfer, goods payout, advance, withholding and retries change money only', async () => {
  const before = await f.report(),
    money = before.snapshot.context['actualMoney'] as ProfitActualMoney;
  await f.deposit();
  await f.transfer();
  await f.payout();
  const advanceEmployee = await f.payroll.create('P24 سلفة مستقلة دون راتب ثابت', '0');
  const advance = f.payroll.command(await f.payroll.read(advanceEmployee.employeeId), {
    type: 'payroll.advance',
    amountMinor: '10000',
    funding: f.payroll.funding,
  });
  const adv = await f.payroll.service().execute(f.admin.token, advance);
  expect(await f.payroll.service().execute(f.admin.token, advance)).toEqual(adv);
  f.payroll.now.today = offsetMonth(f.month, 1) + '-01';
  try {
    const p = await f.payroll.read(f.employee.employeeId);
    const command = f.payroll.command(p, { type: 'payroll.payout', funding: f.payroll.funding });
    const r = await f.payroll.service().execute(f.admin.token, command);
    expect(await f.payroll.service().execute(f.admin.token, command)).toEqual(r);
  } finally {
    f.payroll.now.today = f.today;
  }
  await f.receive(f.arrival);
  await f.receive(f.event);
  await f.drain();
  const after = await f.report(),
    profit = after.snapshot.context['profit'] as ProfitSummary;
  expect(profit.profitMinor).toBe('620000');
  expect(profit.payroll).toMatchObject({
    employeeCostMinor: '400000',
    incidentRecoveryWithheldMinor: '20000',
    advanceRecoveryMinor: '0',
    payoutMinor: '80000',
  });
  expect(after.snapshot.context['actualMoney']).not.toEqual(money);
  const input = f.command(),
    r = await f.reporting.create(f.admin.token, input);
  expect(await f.reporting.create(f.admin.token, input)).toEqual(r);
  evidence['A01-exclusions'] = {
    before: before.snapshot,
    after: after.snapshot,
    advanceCommandId: advance.commandId,
  };
});
it('A06 report summaries retain ordinary source permissions; denied scope/revocation deny frozen rows and downloads', async () => {
  await expect(f.report({ branchIds: [f.b] }, f.reportA.token)).rejects.toThrow('FORBIDDEN_SCOPE');
  const summary = await f.report({}, f.reportsOnly.token);
  expect(
    reportingResponseValidators.page(summary),
    JSON.stringify(reportingResponseValidators.page.errors),
  ).toBe(true);
  expect(
    (summary.snapshot.context['actualMoney'] as ProfitActualMoney).storageCreditMinor,
  ).toBeNull();
  expect(summary.rows.every((r) => !r.economicEffect && r.sourceIds.length === 0)).toBe(true);
  await expect(
    f.reporting.category(
      f.reportsOnly.token,
      f.company,
      summary.snapshot.id,
      'employee_commission',
    ),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
  const scoped = await f.report({ branchIds: [f.a] }, f.reportA.token);
  const input: ExportCommand = {
    ...f.env({}),
    type: 'report.export',
    snapshotId: scoped.snapshot.id,
    filterDigest: scoped.snapshot.filterDigest,
    format: 'xlsx',
  };
  const job = (await exportCommands(db.pool).execute(f.reportA.token, input)).body as ExportJob;
  await new ExportWorker(db.pool).runOne();
  await f.revoke('source');
  try {
    await expect(
      f.reporting.category(f.reportA.token, f.company, scoped.snapshot.id, 'employee_commission'),
    ).rejects.toThrow('FORBIDDEN_SCOPE');
    await expect(
      UnitOfWork.run(db.pool, f.reportA.token, f.company, 'reports', (u) =>
        downloadExport(u, job.id),
      ),
    ).rejects.toThrow('FORBIDDEN_SCOPE');
  } finally {
    await f.revoke('source', true);
  }
  await f.revoke('reports');
  try {
    await expect(f.reporting.page(f.reportA.token, f.company, scoped.snapshot.id)).rejects.toThrow(
      'FORBIDDEN_SCOPE',
    );
  } finally {
    await f.revoke('reports', true);
  }
  evidence['A06'] = { summary, scopedSnapshot: scoped.snapshot.id, jobId: job.id };
});
it('A07 exact account projection delta, stale/unauthorized rebuild refusal and idempotent audited repair post no cash', async () => {
  const count = () =>
    db.pool.query(
      "SELECT count(*)::int AS n FROM kernel.journal_effect WHERE company_id=$1 AND family='money'",
      [f.company],
    );
  const n = (await count()).rows[0].n;
  await f.fault();
  const broken = await f.report();
  const finding = (broken.snapshot.context['reconciliation'] as ProfitReconciliationFinding[]).find(
    (x) => x.kind === 'account_projection' && x.targetId === f.aCash,
  )!;
  expect(finding).toMatchObject({ deltaMinor: '123' });
  const input = {
    accountId: f.aCash,
    expectedProjectionMinor: finding.observedMinor!,
    expectedJournalMinor: finding.expectedMinor!,
    expectedProjectionVersion: finding.observedVersion,
    reason: 'P24 labelled isolated projection rebuild',
  };
  await expect(
    UnitOfWork.run(db.pool, f.reportsOnly.token, f.company, 'reports', (u) =>
      rebuildAccountProjection(u, input),
    ),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', (u) =>
      rebuildAccountProjection(u, { ...input, expectedJournalMinor: '1' }),
    ),
  ).rejects.toThrow('REVISION_CONFLICT');
  const originalFix = await UnitOfWork.run(
    db.pool,
    f.admin.token,
    f.company,
    'finance.accounts',
    (u) => rebuildAccountProjection(u, input),
  );
  expect((await count()).rows[0].n).toBe(n);
  // Two genuine commands cancel in amount, but still change the reviewed source revision.
  await f.deposit(f.aCash, f.a, '1');
  await f.finance.execute(
    f.admin.token,
    f.env({
      type: 'movement.create',
      fields: {
        accountId: f.aCash,
        branchId: f.a,
        currency: 'EGP',
        amountMinor: '1',
        actualDate: f.today,
        method: 'cash',
        direction: 'withdrawal',
        reason: 'P24 isolated net-zero version race witness',
      },
    }) as FinanceCommand,
  );
  await f.fault();
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', (u) =>
      rebuildAccountProjection(u, input),
    ),
  ).rejects.toThrow('REVISION_CONFLICT');
  const current = await f.report();
  input.expectedProjectionVersion = (
    current.snapshot.context['reconciliation'] as ProfitReconciliationFinding[]
  ).find((x) => x.kind === 'account_projection' && x.targetId === f.aCash)!.observedVersion;
  const repairCount = (await count()).rows[0].n;
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', (u) =>
      rebuildAccountProjection(u, { ...input, expectedProjectionVersion: 'stale' }),
    ),
  ).rejects.toThrow('REVISION_CONFLICT');
  const fixed = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', (u) =>
    rebuildAccountProjection(u, input),
  );
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'finance.accounts', (u) =>
    rebuildAccountProjection(u, { ...input, expectedProjectionMinor: fixed.afterMinor }),
  );
  expect((await count()).rows[0].n).toBe(repairCount);
  const refreshed = await f.report();
  expect(
    (refreshed.snapshot.context['reconciliation'] as ProfitReconciliationFinding[]).some(
      (x) => x.targetId === f.aCash,
    ),
  ).toBe(false);
  expect((await f.reporting.page(f.admin.token, f.company, broken.snapshot.id)).snapshot).toEqual(
    broken.snapshot,
  );
  evidence['A07'] = {
    finding,
    originalFix,
    fixed,
    newSnapshotId: refreshed.snapshot.id,
    moneyEffectsBefore: n,
    moneyEffectsBeforeRepair: repairCount,
    moneyEffectsAfter: (await count()).rows[0].n,
  };
});
it('coherent snapshots race committed incident earning correction with independent connections; old evidence remains reproducible', async () => {
  const incident = await f.incidentDetail(f.incidentId);
  await f.service().execute(
    f.admin.token,
    f.incidentCommand({
      type: 'incident.review',
      incidentId: incident.id,
      expectedVersion: incident.version,
      reason: 'P24 documented corrected compensation value',
    }),
  );
  const service = new SettlementService(db.pool);
  const corrector = await f.make('p24-correction', [f.a, f.b], f.adminRole);
  const operation: SettlementOperation = {
    operation: 'incident.resolve',
    incidentId: incident.id,
    decision: 'correct_compensation',
    compensationDeltaMinor: '-10000',
    actualDate: f.today,
  };
  const preview = await service.prepare(corrector.token, { companyId: f.company, operation });
  const correction: SettlementCommand = {
    ...f.env({}),
    type: 'settlement.confirm',
    reason: 'P24 actual linked correction',
    operation,
    expectedVersions: preview.versions,
    expectedDigest: preview.digest,
  };
  const gate = deferred(),
    release = deferred();
  const reporting = new ReportingService(db.pool, {
    afterSourceRead: async () => {
      gate.resolve();
      await release.promise;
    },
  });
  const pending = reporting.create(f.admin.token, f.command());
  await gate.promise;
  try {
    await service.confirm(corrector.token, correction);
  } finally {
    release.resolve();
  }
  const old = await pending,
    newer = await f.report();
  expect((old.snapshot.context['profit'] as ProfitSummary).profitMinor).toBe('620000');
  expect((newer.snapshot.context['profit'] as ProfitSummary).profitMinor).toBe('630000');
  const detail = await f.reporting.category(
    f.admin.token,
    f.company,
    newer.snapshot.id,
    'brand_compensation',
  );
  expect(detail.rows.reduce((n, r) => n + BigInt(r.values['amountMinor']!), 0n).toString()).toBe(
    '-40000',
  );
  expect(detail.rows.some((r) => r.economicEffect!.correctionOf.length > 0)).toBe(true);
  expect((await f.reporting.page(f.admin.token, f.company, old.snapshot.id)).snapshot).toEqual(
    old.snapshot,
  );
  expect(await service.confirm(corrector.token, correction)).toMatchObject({ status: 200 });
  evidence['snapshot-race'] = {
    old: old.snapshot,
    new: newer.snapshot,
    correctionCommandId: correction.commandId,
    detail,
  };
});
it('indexed real source query is parameterized and deterministic, with measured plan and no join fanout', async () => {
  const args = [f.company, [f.a, f.b], f.from, f.to, 'effective', false];
  const started = performance.now();
  const plan = (
    await db.pool.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + profitEffectsSql, args)
  ).rows[0]['QUERY PLAN'];
  const a = (await db.pool.query(profitEffectsSql, args)).rows,
    b = (await db.pool.query(profitEffectsSql, args)).rows;
  expect(a).toEqual(b);
  expect(new Set(a.map((r) => r.effectId)).size).toBe(a.length);
  evidence['query-behavior'] = {
    rowCount: a.length,
    totalSampleMs: performance.now() - started,
    plan,
    claim: 'isolated functional fixture only; no production capacity guarantee',
  };
});
it('P23 frozen XLSX/PDF preserve every source and totals while export rendering overlaps committed inbox progress', async () => {
  const page = await f.report(),
    rows = await snapshotRows(db.pool, f.company, page.snapshot.id),
    jobs = [];
  for (const format of ['xlsx', 'pdf'] as const) {
    const input: ExportCommand = {
      ...f.env({}),
      type: 'report.export',
      snapshotId: page.snapshot.id,
      filterDigest: page.snapshot.filterDigest,
      format,
    };
    const job = (await exportCommands(db.pool).execute(f.admin.token, input)).body as ExportJob;
    const gate = deferred(),
      release = deferred();
    const pending = new ExportWorker(db.pool, {
      beforeRender: async () => {
        gate.resolve();
        await release.promise;
      },
    }).runOne();
    await gate.promise;
    const started = performance.now();
    const v = await f.received({ brandReference: 'P24 export concurrent source ' + format });
    await f.receive(v.arrival());
    await f.drain();
    const sourceMs = performance.now() - started;
    release.resolve();
    await pending;
    const artifact = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'reports', (u) =>
      downloadExport(u, job.id),
    );
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Uint8Array.from(artifact.bytes!).buffer);
      expect(workbook.getWorksheet('المصادر')!.rowCount).toBe(rows.length + 1);
      expect(workbook.getWorksheet('التقرير')!.getCell('C' + (rows.length + 8)).value).toBe(
        '6300.00',
      );
      for (let i = 0; i < rows.length; i++)
        expect(
          workbook
            .getWorksheet('المصادر')!
            .getRow(i + 2)
            .getCell(1).value,
        ).toBe(rows[i]!.id);
    } else expect(artifact.bytes!.subarray(0, 5).toString()).toBe('%PDF-');
    await writeFile('docs/verification/P24/operating-profit.' + format, artifact.bytes!);
    jobs.push({ format, jobId: job.id, sha256: artifact.sha256, sourceMs });
  }
  evidence['exports'] = {
    snapshot: page.snapshot,
    jobs,
    claim: 'actual inbox application during paused export rendering; not a capacity guarantee',
  };
});
it('an unresolved source checkpoint keeps unrelated amounts and frozen prior evidence, with read-only scoped freshness', async () => {
  const before = await f.report();
  await f.gap();
  const after = await f.report();
  expect((after.snapshot.context['profit'] as ProfitSummary).profitMinor).toBe(
    (before.snapshot.context['profit'] as ProfitSummary).profitMinor,
  );
  expect(after.snapshot.coverage.complete).toBe(false);
  expect(after.snapshot.coverage.flags).toContain('SOURCE_HISTORY_INCOMPLETE');
  expect(
    (after.snapshot.context['reconciliation'] as ProfitReconciliationFinding[]).some(
      (x) =>
        x.kind === 'source_checkpoint' && x.asOf === after.snapshot.asOf && x.sourceIds.length > 0,
    ),
  ).toBe(true);
  expect((await f.reporting.page(f.admin.token, f.company, before.snapshot.id)).snapshot).toEqual(
    before.snapshot,
  );
  const restricted = await f.report({}, f.reportsOnly.token);
  expect(
    reportingResponseValidators.page(restricted),
    JSON.stringify(reportingResponseValidators.page.errors),
  ).toBe(true);
  expect(
    (restricted.snapshot.context['reconciliation'] as ProfitReconciliationFinding[]).every(
      (x) => x.sourceIds.length === 0 && x.targetId === 'restricted',
    ),
  ).toBe(true);
  evidence['incomplete-source'] = {
    before: before.snapshot,
    after: after.snapshot,
    restricted: restricted.snapshot,
  };
  const scopedCommand = f.command({ branchIds: [f.a] });
  const scoped = await f.reporting.create(f.reportA.token, scopedCommand);
  await db.pool.query(
    "DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='integration'",
    [f.company, f.scopedRole],
  );
  try {
    const exportInput: ExportCommand = {
      ...f.env({}),
      type: 'report.export',
      snapshotId: scoped.snapshot.id,
      filterDigest: scoped.snapshot.filterDigest,
      format: 'xlsx',
    };
    // Every computed row grant is retained; the warning's recovery target still requires its
    // own grant because the workbook/PDF contain full frozen warning provenance.
    await expect(exportCommands(db.pool).execute(f.reportA.token, exportInput)).rejects.toThrow(
      'FORBIDDEN_SCOPE',
    );
    const read = await f.reporting.page(f.reportA.token, f.company, scoped.snapshot.id);
    const retry = await f.reporting.create(f.reportA.token, scopedCommand);
    expect(retry.snapshot.id).toBe(scoped.snapshot.id);
    expect(retry.snapshot.context).toEqual(read.snapshot.context);
    expect(
      (retry.snapshot.context['reconciliation'] as ProfitReconciliationFinding[])
        .filter((x) => x.sourceCapability === 'integration')
        .every(
          (x) =>
            x.sourceIds.length === 0 &&
            x.targetId === 'restricted' &&
            x.observedVersion === 'restricted' &&
            x.recoveryPath === null,
        ),
    ).toBe(true);
    expect(
      (read.snapshot.context['reconciliation'] as ProfitReconciliationFinding[])
        .filter((x) => x.sourceCapability === 'integration')
        .every((x) => x.sourceIds.length === 0 && x.targetId === 'restricted'),
    ).toBe(true);
  } finally {
    await db.pool.query(
      "INSERT INTO access.role_grant VALUES($1,$2,'integration') ON CONFLICT DO NOTHING",
      [f.company, f.scopedRole],
    );
  }
});
