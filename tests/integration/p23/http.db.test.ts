import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, migrationStatus } from '@shahn/database';
import { reportingResponseValidators, type ExportJob } from '@shahn/contracts';
import { reportFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { ExportWorker } from '../../../apps/api/src/modules/reporting/exports.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof reportFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin = '';
const evidence: Record<string, unknown> = {};
const businessTables = [
  'kernel.journal_effect',
  'kernel.source_record',
  'kernel.lot_allocation',
  'inventory.stock_movement',
  'execution.visit_fact',
  'finance.paid_expense',
  'access.role_grant',
];
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(
    db.pool,
    (await readMigrations()).filter((m) => m.version < '0027'),
  );
  f = await reportFixture(db.pool);
  const capture = async () =>
    Object.fromEntries(
      await Promise.all(
        businessTables.map(async (t) => [
          t,
          (await db.pool.query(`SELECT to_jsonb(t) AS row FROM ${t} t ORDER BY to_jsonb(t)::text`))
            .rows,
        ]),
      ),
    );
  const before = await capture();
  await migrate(db.pool);
  expect(await capture()).toEqual(before);
  evidence.upgrade = {
    unchangedTables: businessTables,
    status: await migrationStatus(db.pool, await readMigrations()),
  };
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
}, 120000);
afterAll(async () => {
  await writeFile('docs/verification/P23/http-upgrade.json', JSON.stringify(evidence, null, 2));
  await app?.close();
  await f?.close();
  await db?.dispose();
});
async function http(
  path: string,
  body?: unknown,
  who = f.admin,
  headers: Record<string, string> = {},
) {
  return fetch(origin + '/api/v1/reports/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: 'erp_session=' + who.token,
      ...(body
        ? {
            'Content-Type': 'application/json',
            Origin: f.config.origin,
            'X-CSRF-Token': who.csrfToken,
          }
        : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
it('A02/03 authenticated HTTP closes authority/filter/schema/CSRF and independent financial scopes', async () => {
  const q = '?companyId=' + f.company;
  expect(
    (await http('catalog' + q, undefined, f.admin, { Authorization: 'Bearer forged' })).status,
  ).toBe(403);
  expect((await http('catalog' + q + '&branchId=' + f.b)).status).toBe(400);
  expect((await http('catalog' + q, undefined, f.trackingOnly)).status).toBe(403);
  const catalog = await (await http('catalog' + q, undefined, f.reportA)).json();
  expect(reportingResponseValidators.catalog(catalog)).toBe(true);
  const cmd = f.command('REP-14', { branchIds: [f.a] });
  expect((await http('snapshots', cmd, f.reportA, { 'X-CSRF-Token': 'forged' })).status).toBe(403);
  expect(
    (await http('snapshots', { ...cmd, filters: { branchIds: [f.b] } }, f.reportA)).status,
  ).toBe(403);
  expect(
    (await http('snapshots', { ...cmd, filters: { columns: ['secret'] } }, f.reportA)).status,
  ).toBe(400);
  expect((await http('snapshots', { ...cmd, companyId: f.other }, f.reportA)).status).toBe(403);
  const p = await (await http('snapshots', cmd, f.reportA)).json();
  expect(reportingResponseValidators.page(p)).toBe(true);
  expect((await http(`snapshots/${p.snapshot.id}/rows/1` + q, undefined, f.admin)).status).toBe(
    404,
  );
  expect(
    (await http(`snapshots/${p.snapshot.id}?companyId=${f.company}&page=0`, undefined, f.reportA))
      .status,
  ).toBe(400);
  const row = await (
    await http(`snapshots/${p.snapshot.id}/rows/1` + q, undefined, f.reportA)
  ).json();
  expect(reportingResponseValidators.row(row)).toBe(true);
  const input = {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'report.export',
    snapshotId: p.snapshot.id,
    filterDigest: p.snapshot.filterDigest,
    format: 'xlsx',
  };
  expect(
    (await http('exports', { ...input, filterDigest: '0'.repeat(64) }, f.reportA)).status,
  ).toBe(409);
  const job = (await (await http('exports', input, f.reportA)).json()) as ExportJob;
  expect(reportingResponseValidators.job(job)).toBe(true);
  expect((await http(`exports/${job.id}/download` + q, undefined, f.reportA)).status).toBe(409);
  expect(
    await (await http('commands/' + input.commandId + q, undefined, f.reportA)).json(),
  ).toEqual(job);
  await new ExportWorker(db.pool).runOne();
  const file = await http(`exports/${job.id}/download` + q, undefined, f.reportA);
  expect(file.status).toBe(200);
  expect(file.headers.get('content-type')).toContain('spreadsheetml');
  expect(file.headers.get('cache-control')).toBe('no-store');
  await db.pool.query(
    `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='finance.accounts'`,
    [f.company, f.scopedRole],
  );
  expect((await http('snapshots', f.command('REP-12'), f.reportA)).status).toBe(403);
  expect(
    (await http('snapshots', f.command('REP-09', { brandIds: [f.brand] }), f.reportA)).status,
  ).toBe(200);
  await db.pool.query(
    `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='reports'`,
    [f.company, f.scopedRole],
  );
  expect((await http(`exports/${job.id}/download` + q, undefined, f.reportA)).status).toBe(403);
  expect((await http('commands/' + input.commandId + q, undefined, f.reportA)).status).toBe(403);
  evidence.authorization = { snapshotId: p.snapshot.id, jobId: job.id, revokedOldLinkDenied: true };
});
