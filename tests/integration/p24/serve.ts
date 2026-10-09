import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { profitFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { ExportWorker } from '../../../apps/api/src/modules/reporting/exports.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { rebuildAccountProjection } from '../../../apps/api/src/modules/finance/accounts/rebuild.js';

// Test-only controls bind localhost and the database is an isolated labelled cluster.
const origin = 'http://127.0.0.1:5424',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const f = await profitFixture(db.pool, origin);
const initial = await f.report();
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
const server = app.getHttpAdapter().getInstance();
server.get('/api/test/p24-login', async (req, reply) => {
  const actor = (req.query as { actor?: string }).actor;
  const user =
    actor === 'a'
      ? f.reportA
      : actor === 'summary'
        ? f.reportsOnly
        : actor === 'tracking'
          ? f.trackingOnly
          : f.admin;
  reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
  return reply.redirect('/reports');
});
await app.listen(4427, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5424',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4427' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await mkdir('docs/verification/P24/screenshots', { recursive: true });
await writeFile(
  'tests/.p24-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    a: f.a,
    b: f.b,
    aCash: f.aCash,
    from: f.from,
    to: f.to,
    initialSnapshotId: initial.snapshot.id,
    initialProfitMinor: (initial.snapshot.context['profit'] as { profitMinor: string }).profitMinor,
  }),
  { mode: 0o600 },
);
const worker = new ExportWorker(db.pool);
let working: Promise<unknown> | undefined,
  stopping = false,
  longLargeAdded = false;
const poll = setInterval(() => {
  if (!working && !stopping)
    working = worker.runOne().finally(() => {
      working = undefined;
    });
}, 100);
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(poll);
  await working;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p24-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
const control = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.end('ready');
    return;
  }
  if (req.headers['x-test-secret'] !== secret) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (req.url === '/late') {
      const result = await f.expense(
        '1000',
        f.from,
        f.a,
        'P24 browser late entry for original work period',
      );
      res.end(JSON.stringify(result));
      return;
    }
    if (req.url === '/revoke-reports') {
      await f.revoke('reports');
      res.end('revoked');
      return;
    }
    if (req.url === '/restore-reports') {
      await f.revoke('reports', true);
      res.end('restored');
      return;
    }
    if (req.url === '/revoke-source') {
      await f.revoke('source');
      res.end('revoked');
      return;
    }
    if (req.url === '/restore-source') {
      await f.revoke('source', true);
      res.end('restored');
      return;
    }
    if (req.url === '/gap') {
      await f.gap();
      res.end('gapped');
      return;
    }
    if (req.url === '/fault') {
      await f.fault();
      res.end('projection fault +123 minor');
      return;
    }
    if (req.url === '/rebuild') {
      const source = (
        await db.pool.query<{ journal: string; projection: string }>(
          `SELECT b.amount_minor::text AS projection,(SELECT COALESCE(sum(amount_minor),0)::text FROM kernel.journal_effect WHERE company_id=b.company_id AND family='money' AND subject_id=b.account_id) AS journal FROM finance.account_balance b WHERE company_id=$1 AND account_id=$2`,
          [f.company, f.aCash],
        )
      ).rows[0]!;
      const result = await UnitOfWork.run(
        db.pool,
        f.admin.token,
        f.company,
        'settlements',
        async (u) =>
          rebuildAccountProjection(u, {
            accountId: f.aCash,
            expectedProjectionMinor: source.projection,
            expectedJournalMinor: source.journal,
            expectedProjectionVersion: (
              await u.client.query(
                `SELECT a.version::text||':'||(SELECT count(*) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='money' AND e.subject_id=a.id)::text AS revision FROM finance.account a WHERE a.company_id=$1 AND a.id=$2`,
                [f.company, f.aCash],
              )
            ).rows[0].revision,
            reason: 'P24 isolated browser reconciliation review',
          }),
      );
      res.end(JSON.stringify(result));
      return;
    }
    if (req.url === '/long-large') {
      if (!longLargeAdded) {
        await f.deposit(f.aCash, f.a, '10000000000000000');
        await f.expense(
          '9007199254740993',
          f.today,
          f.a,
          'مصروف تشغيل طويل قابل للتفسير من المصدر '.repeat(20),
        );
        for (let i = 0; i < 30; i++)
          await f.expense(
            '100',
            f.today,
            f.a,
            `P24 صفحة PDF ${i} · مصدر فعلي ببيان عربي طويل قابل للقراءة`,
          );
        await db.pool.query('UPDATE access.branch SET name=$3 WHERE company_id=$1 AND id=$2', [
          f.company,
          f.a,
          'فرع القاهرة التاريخي لخدمة العملاء والمخزون والتخزين والتحصيل مع اسم عربي طويل لا يغير الاستحقاق',
        ]);
        longLargeAdded = true;
      }
      res.end('posted real domain expenses');
      return;
    }
    if (req.url === '/stop') {
      res.end('stopping');
      void stop();
      return;
    }
    res.writeHead(404).end();
  } catch (error) {
    res
      .writeHead(500, { 'content-type': 'application/json' })
      .end(JSON.stringify({ error: error instanceof Error ? error.message : 'control failed' }));
  }
});
control.listen(4428, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
