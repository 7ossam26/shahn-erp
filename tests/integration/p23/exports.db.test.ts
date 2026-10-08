import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { ExportCommand, ExportJob } from '@shahn/contracts';
import { reportFixture } from './fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import {
  ExportWorker,
  exportCommands,
  exportJob,
  downloadExport,
} from '../../../apps/api/src/modules/reporting/exports.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof reportFixture>>;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await reportFixture(db.pool);
}, 120000);
afterAll(async () => {
  await writeFile('docs/verification/P23/exports.json', JSON.stringify(evidence, null, 2));
  await f?.close();
  await db?.dispose();
}, 120000);
const commands = () => exportCommands(db.pool);
const job = (id: string) =>
  UnitOfWork.run(db.pool, f.admin.token, f.company, 'reports', (u) => exportJob(u, id));
const download = (id: string) =>
  UnitOfWork.run(db.pool, f.admin.token, f.company, 'reports', (u) => downloadExport(u, id));
async function prepare(format: 'xlsx' | 'pdf' = 'xlsx', report: 'REP-01' | 'REP-14' = 'REP-01') {
  const p = await f.report(
    report,
    report === 'REP-01'
      ? { search: 'P23-REGISTER-' }
      : { from: f.today, to: f.today, branchIds: [f.a] },
  );
  const input: ExportCommand = {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'report.export',
    snapshotId: p.snapshot.id,
    filterDigest: p.snapshot.filterDigest,
    format,
  };
  const result = (await commands().execute(f.admin.token, input)).body as ExportJob;
  return { input, result, p };
}
it('A06 actual process dies before/after publication; lease reclaim returns one artifact and lost-response replay retains one job', async () => {
  const runs = [];
  for (const boundary of ['before', 'after']) {
    const x = await prepare();
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'tests/integration/p23/export-process.ts'],
      {
        env: {
          ...process.env,
          TSX_TSCONFIG_PATH: 'tsconfig.base.json',
          P23_TEST_DATABASE: db.url,
          P23_EXPORT_KILL_BOUNDARY: boundary,
        },
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    const code = await new Promise<number | null>((r, j) => {
      child.on('exit', r);
      child.on('error', j);
    });
    expect(code).toBe(boundary === 'before' ? 76 : 77);
    const first = (
      await db.pool.query(`SELECT id FROM reporting.artifact WHERE company_id=$1 AND job_id=$2`, [
        f.company,
        x.result.id,
      ])
    ).rows[0]?.id;
    if (boundary === 'after') expect(first).toBeTruthy();
    else expect(first).toBeUndefined();
    expect((await job(x.result.id)).downloadUrl).toBeNull();
    // Real clock expiry of the short test lease; no mutation of its fence/state.
    await new Promise((r) => setTimeout(r, 1100));
    await new ExportWorker(db.pool).runOne();
    const completed = await job(x.result.id);
    expect(completed.state).toBe('completed');
    if (first) expect(completed.artifactId).toBe(first);
    expect((await commands().execute(f.admin.token, x.input)).body).toMatchObject({
      id: x.result.id,
    });
    await expect(commands().execute(f.admin.token, { ...x.input, format: 'pdf' })).rejects.toThrow(
      'COMMAND_PAYLOAD_CONFLICT',
    );
    expect(
      (
        await db.pool.query(
          `SELECT count(*)::int AS n FROM reporting.artifact WHERE company_id=$1 AND job_id=$2`,
          [f.company, x.result.id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect((await download(x.result.id)).bytes!.length).toBeGreaterThan(100);
    runs.push({ boundary, exitCode: code, firstArtifactId: first ?? null, completed });
  }
  evidence.restart = runs;
});
it('stale worker cannot publish or announce success under a reclaimed fence', async () => {
  const x = await prepare();
  let entered!: () => void, release!: () => void;
  const enteredPromise = new Promise<void>((r) => {
      entered = r;
    }),
    barrier = new Promise<void>((r) => {
      release = r;
    });
  const old = new ExportWorker(db.pool, {
      beforeRender: async () => {
        entered();
        await barrier;
      },
    }),
    pending = old.runOne(1);
  await enteredPromise;
  await new Promise((r) => setTimeout(r, 1100));
  await new ExportWorker(db.pool).runOne();
  const current = await job(x.result.id);
  release();
  await pending;
  expect((await job(x.result.id)).artifactId).toBe(current.artifactId);
  expect(current.attempts).toBe(2);
  expect(current.state).toBe('completed');
});
it('expiry denies old endpoint, purges only bytes, retains snapshot/metadata and allows a new export intent', async () => {
  // Test-only schema default; existing jobs and immutable business rows are untouched.
  await db.pool.query(
    `ALTER TABLE reporting.export_job ALTER COLUMN expires_at SET DEFAULT clock_timestamp()-interval '1 second'`,
  );
  let x: Awaited<ReturnType<typeof prepare>>;
  try {
    x = await prepare();
  } finally {
    await db.pool.query(
      `ALTER TABLE reporting.export_job ALTER COLUMN expires_at SET DEFAULT clock_timestamp()+interval '24 hours'`,
    );
  }
  expect((await job(x.result.id)).state).toBe('expired');
  await expect(download(x.result.id)).rejects.toThrow('EXPORT_EXPIRED');
  await new ExportWorker(db.pool).runOne();
  const oldSnapshot = await f.reporting.page(f.admin.token, f.company, x.p.snapshot.id);
  expect(oldSnapshot.snapshot.totalRows).toBe(27);
  const again = (await commands().execute(f.admin.token, { ...x.input, commandId: randomUUID() }))
    .body as ExportJob;
  expect(again.id).not.toBe(x.result.id);
  await new ExportWorker(db.pool).runOne();
  expect((await job(again.id)).state).toBe('completed');
  // Purge a published artifact after its original 24h lifecycle using a genuinely expired
  // isolated job created by a temporary short TTL default, while rendering before expiry.
  await db.pool.query(
    `ALTER TABLE reporting.export_job ALTER COLUMN expires_at SET DEFAULT clock_timestamp()+interval '2 seconds'`,
  );
  let short: Awaited<ReturnType<typeof prepare>>;
  try {
    short = await prepare();
  } finally {
    await db.pool.query(
      `ALTER TABLE reporting.export_job ALTER COLUMN expires_at SET DEFAULT clock_timestamp()+interval '24 hours'`,
    );
  }
  const worker = new ExportWorker(db.pool);
  await worker.runOne();
  await new Promise((r) => setTimeout(r, 2100));
  await worker.expire();
  const a = (
    await db.pool.query(
      `SELECT bytes,id FROM reporting.artifact WHERE company_id=$1 AND job_id=$2`,
      [f.company, short.result.id],
    )
  ).rows[0];
  expect(a.bytes).toBeNull();
  expect(a.id).toBeTruthy();
  await expect(download(short.result.id)).rejects.toThrow('EXPORT_EXPIRED');
});
it('A01 readable real PDF and XLSX consume same27-row snapshot and expense200; rendering holds no database transaction', async () => {
  const x = await prepare('pdf');
  const started = performance.now();
  let transactions: unknown[] = [];
  await new ExportWorker(db.pool, {
    beforeRender: async () => {
      transactions = (
        await db.pool.query(
          `SELECT state FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='idle in transaction'`,
        )
      ).rows;
    },
  }).runOne();
  const completed = await job(x.result.id);
  expect(completed.state).toBe('completed');
  const a = await download(x.result.id);
  expect(a.bytes!.subarray(0, 5).toString()).toBe('%PDF-');
  expect(transactions).toHaveLength(0);
  await writeFile('docs/verification/P23/shipments-27.pdf', a.bytes!);
  const xlsxJob = (
    await commands().execute(f.admin.token, { ...x.input, commandId: randomUUID(), format: 'xlsx' })
  ).body as ExportJob;
  await new ExportWorker(db.pool).runOne();
  const xa = await download(xlsxJob.id),
    workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(xa.bytes!).buffer);
  expect(workbook.getWorksheet('المصادر')!.rowCount).toBe(28);
  expect(String(workbook.getWorksheet('التقرير')!.getCell('A5').value)).toContain(x.p.snapshot.id);
  await writeFile('docs/verification/P23/same-snapshot-27.xlsx', xa.bytes!);
  const expense = await prepare('pdf', 'REP-14');
  await new ExportWorker(db.pool).runOne();
  const ea = await download(expense.result.id);
  expect(expense.p.snapshot.totals['amountMinor']).toBe('20000');
  await writeFile('docs/verification/P23/expenses-200.pdf', ea.bytes!);
  const ej = (
    await commands().execute(f.admin.token, {
      ...expense.input,
      commandId: randomUUID(),
      format: 'xlsx',
    })
  ).body as ExportJob;
  await new ExportWorker(db.pool).runOne();
  const ex = await download(ej.id),
    eb = new ExcelJS.Workbook();
  await eb.xlsx.load(Uint8Array.from(ex.bytes!).buffer);
  expect(eb.getWorksheet('التقرير')!.getCell('F8').value).toBe('200.00');
  expect(String(eb.getWorksheet('التقرير')!.getCell('A5').value)).toContain(expense.p.snapshot.id);
  await writeFile('docs/verification/P23/same-snapshot-expenses.xlsx', ex.bytes!);
  evidence.pdf = {
    rowCount: 27,
    completionMs: performance.now() - started,
    snapshotId: x.p.snapshot.id,
    dataDigest: x.p.snapshot.dataDigest,
    artifactSha256: a.sha256,
    xlsxSha256: xa.sha256,
    expenseSnapshot: expense.p.snapshot,
  };
});
it('export lane preparation overlaps actual source application; records sample size/timing without a capacity claim', async () => {
  const x = await prepare('pdf');
  let entered!: () => void;
  const start = new Promise<void>((r) => {
    entered = r;
  });
  const before = (
    await db.pool.query(
      `SELECT count(*)::int AS n FROM integration.inbox WHERE company_id=$1 AND application_state='applied'`,
      [f.company],
    )
  ).rows[0].n;
  const exportWorker = new ExportWorker(db.pool, {
    beforeRender: async () => {
      entered();
    },
  });
  const started = performance.now(),
    pending = exportWorker.runOne();
  await start;
  const sourceStarted = performance.now();
  const r = await f.brandRound(f.brand, [
    { kind: 'full', goodsMinor: '1000' },
    { kind: 'refused', goodsMinor: '1000' },
    { kind: 'no-answer', goodsMinor: '1000' },
  ]);
  const after = (
    await db.pool.query(
      `SELECT count(*)::int AS n FROM integration.inbox WHERE company_id=$1 AND application_state='applied'`,
      [f.company],
    )
  ).rows[0].n;
  const sourceCompleted = performance.now();
  expect(after - before).toBeGreaterThanOrEqual(8);
  await pending;
  const exportCompleted = performance.now();
  expect(sourceStarted).toBeLessThan(exportCompleted);
  expect((await job(x.result.id)).state).toBe('completed');
  const report = await f.report('REP-05', { driverIds: [f.driver] });
  const visits = report.rows.filter((row) => row.values['kind'] === 'visit');
  expect(report.snapshot.totals['visits']).toBe(String(visits.length));
  expect(new Set(visits.map((row) => row.sourceIds[0])).size).toBe(visits.length);
  expect(
    report.rows.some((row) => row.values['kind'] === 'round' && row.values['status'] === 'closed'),
  ).toBe(true);
  evidence.laneSample = {
    appliedEvents: after - before,
    elapsedMs: exportCompleted - started,
    sourceMs: sourceCompleted - sourceStarted,
    sourceStartedMs: sourceStarted - started,
    sourceCompletedMs: sourceCompleted - started,
    roundId: r.round.roundId,
    report,
    claim: 'isolated functional overlap sample only; not production capacity',
  };
});
