import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../apps/api/src/app.js';
import { cookie } from '../../apps/api/src/modules/access/http.js';
import { treasuryFixture } from '../support/treasury.js';
const origin = 'http://127.0.0.1:5315',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await mkdir('docs/verification/P10/screenshots', { recursive: true });
await migrate(db.pool);
const f = await treasuryFixture(db.pool, origin);
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user, route] of [
  ['sender', f.staffA, '/treasury/transfers'],
  ['receiver', f.staffB, '/treasury/receipts'],
  ['both', f.staffAB, '/treasury/transfers'],
  ['admin', f.admin, '/finance/accounts'],
] as const)
  server.get('/api/test/p10-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect(route);
  });
await app.listen(4315, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5315',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4315' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
const ids = {
  companyId: f.company,
  branchA: f.a,
  branchB: f.b,
  branchC: f.c,
  sourceId: f.source.entityId,
  destinationId: f.seed.cash.entityId,
  categoryId: f.seed.categoryId,
};
await writeFile('tests/.p10-runtime.json', JSON.stringify({ ...ids, secret }), { mode: 0o600 });
await writeFile('docs/verification/P10/seed-ids.json', JSON.stringify(ids, null, 2));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p10-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
const control = createServer(async (req, res) => {
  try {
    if (req.url === '/health') {
      res.end('ready');
      return;
    }
    if (req.headers['x-test-secret'] !== secret) {
      res.statusCode = 403;
      res.end();
      return;
    }
    if (req.url === '/stop') {
      res.end('stopping');
      void stop();
      return;
    }
    if (req.url === '/statistics') {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify(
          (
            await db.pool.query(
              `SELECT
   (SELECT amount_minor::text FROM finance.account_balance WHERE account_id=$1) AS source,
   (SELECT amount_minor::text FROM finance.account_balance WHERE account_id=$2) AS destination,
   (SELECT COALESCE(sum(amount_minor),0)::text FROM finance.treasury_transit_movement WHERE company_id=$3) AS transit,
   (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$3 AND family='operating') AS "profitFacts",
   (SELECT count(*)::int FROM finance.money_movement WHERE company_id=$3 AND source_kind='treasury_receive') AS receipts`,
              [ids.sourceId, ids.destinationId, ids.companyId],
            )
          ).rows[0],
        ),
      );
      return;
    }
    if (req.url === '/bump-destination') {
      const a = (
        await db.pool.query('SELECT version FROM finance.account WHERE id=$1', [ids.destinationId])
      ).rows[0];
      await f.finance.execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'account.update',
        accountId: ids.destinationId,
        expectedVersion: a.version,
        fields: {
          name: 'P10 خزينة ب — اسم طويل للمراجعة على الهاتف والكمبيوتر بعد تغيير الحساب',
          type: 'cash',
          currency: 'EGP',
          branchIds: [f.b],
          active: true,
          bankDescription: '',
        },
      });
      res.end('updated');
      return;
    }
    res.statusCode = 404;
    res.end();
  } catch (error) {
    console.error('P10_FIXTURE_CONTROL_FAILED', error instanceof Error ? error.message : 'unknown');
    res.statusCode = 500;
    res.end('fixture control failed');
  }
});
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (i === 99) {
    await stop();
    throw Error('P10_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4316, '127.0.0.1');
if (process.env['P10_MANUAL_TRIAL'] === 'true')
  console.log(
    'Isolated P10 trial: http://127.0.0.1:5315/api/test/p10-login/sender — receiver: /api/test/p10-login/receiver. Ctrl+C stops the disposable fixture.',
  );
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
