import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { settlementFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
/**
 * P21 isolated trial: disposable PostgreSQL, real API and web app, real P09 accounts funded by a
 * real deposit, real P07 stock and real P20 payroll clock. Every start is a new database and a new
 * company, so an opening batch entered first is entered into a clean company. Never touches a
 * non-test database, Tawsel or real money.
 */
const origin = 'http://127.0.0.1:5421',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
const f = await settlementFixture(db.pool, origin);
// Settlement targets: one product with 12 sound units at branch A; cash A holds 1000.00 EGP.
const stock = await f.product(['أزرق', 'أحمر']);
await f.receive(stock['أزرق']!, 12);
// Owner A02 trial: 12 black received, 7 reserved by two unhanded orders; white dispatches apart.
const trial = await f.product(['أسود', 'أبيض']);
await f.receive(trial['أسود']!, 12);
await f.receive(trial['أبيض']!, 3);
const reservedOrders = [await f.order(trial['أسود']!, 4), await f.order(trial['أسود']!, 3)];
const otherOrder = await f.order(trial['أبيض']!, 1);
// Opening targets that have no history: a new zero account, a new product, a new employee.
const openingCash = await f.account('خزنة رصيد البداية', 'cash', [f.a]);
const openingStock = await f.product(['أخضر']);
const openingEmployee = await f.employee('موظف رصيد افتتاحي');
// A second settlement user with the full role whose branch assignment can be revoked mid-form.
const scoped = await f.make('settle-scoped', [f.a, f.b], f.adminRole);
await mkdir('docs/verification/P21/screenshots', { recursive: true });
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    { connections: [] },
    { payrollClock: f.payrollClock },
  ),
  server = app.getHttpAdapter().getInstance();
const users = { admin: f.admin, scoped, staffA: f.staffA };
server.get('/api/test/p21-login/:who', async (req, reply) => {
  const who = (req.params as { who: keyof typeof users }).who;
  if (!users[who]) return reply.code(404).send({});
  reply.header('Set-Cookie', cookie('erp_session', users[who].token, 1800));
  return reply.redirect('/settlements');
});
await app.listen(4421, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5421',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4421' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
const runtime = {
  secret,
  companyId: f.company,
  branchA: f.a,
  branchB: f.b,
  cash: f.cash,
  bank: f.bank,
  brand: f.seed.brand,
  category: f.category,
  blue: stock['أزرق']!,
  red: stock['أحمر']!,
  openingCash,
  openingGreen: openingStock['أخضر']!,
  openingEmployee: openingEmployee.employeeId,
  trialBlack: trial['أسود']!,
  trialWhite: trial['أبيض']!,
  reservedOrders: reservedOrders.map((o) => o.reference),
  otherOrder: otherOrder.reference,
};
await writeFile('tests/.p21-runtime.json', JSON.stringify(runtime), { mode: 0o600 });
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM settlements.adjustment_case WHERE company_id=$1) cases,
       (SELECT count(*)::int FROM settlements.resolution WHERE company_id=$1) resolutions,
       (SELECT COALESCE(sum(active_minor),0)::text FROM settlements.account_hold_balance WHERE company_id=$1) held,
       (SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$2) cash,
       (SELECT COALESCE((SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$5),'0')) "openingCash",
       (SELECT count(*)::int FROM finance.money_movement WHERE company_id=$1) movements,
       (SELECT count(*)::int FROM finance.money_movement WHERE company_id=$1 AND source_kind='opening') "openingMovements",
       (SELECT count(*)::int FROM settlements.opening_batch WHERE company_id=$1) batches,
       (SELECT count(*)::int FROM settlements.opening_line WHERE company_id=$1) "openingLines",
       (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1 AND family='operating') "operatingEffects",
       (SELECT sound_on_hand::int FROM inventory.stock_position WHERE company_id=$1 AND branch_id=$3 AND variant_id=$4) blue,
       (SELECT COALESCE((SELECT sound_on_hand::int FROM inventory.stock_position WHERE company_id=$1 AND branch_id=$3 AND variant_id=$6),0)) green`,
      [f.company, f.cash, f.a, runtime.blue, openingCash, runtime.openingGreen],
    )
  ).rows[0];
let stopping = false;
/**
 * Teardown waits for this reply: the database is disposed before the runner signals the server's
 * process group, so the signal cannot interrupt pg_ctl and leak a test cluster.
 */
async function stop(reply?: import('node:http').ServerResponse) {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p21-runtime.json').catch(() => {});
  await app.close();
  await db.dispose();
  reply?.end('stopped');
  control.close();
  process.exit(0);
}
const json = (res: import('node:http').ServerResponse, value: unknown) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(value));
};
const control = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/health') {
    try {
      const ready = await fetch(origin);
      res.writeHead(ready.ok ? 200 : 503).end('ready');
    } catch {
      res.writeHead(503).end('starting');
    }
    return;
  }
  if (req.headers['x-test-secret'] !== secret) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (url.pathname === '/stop') await stop(res);
    else if (url.pathname === '/counts') json(res, await counts());
    else if (url.pathname === '/receive') {
      // A competing genuine receipt by another user makes a reviewed stock preview stale.
      await f.receive(runtime.blue, Number(url.searchParams.get('quantity') ?? '1'));
      json(res, await counts());
    } else if (url.pathname === '/branch') {
      const branch = url.searchParams.get('branch') === 'B' ? f.b : f.a;
      if (url.searchParams.get('assign') === 'true')
        await db.pool.query(
          `INSERT INTO access.user_branch VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
          [f.company, scoped.id, branch],
        );
      else
        await db.pool.query(
          `DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2 AND branch_id=$3`,
          [f.company, scoped.id, branch],
        );
      json(res, { ok: true });
    } else res.writeHead(404).end();
  } catch (error) {
    res.writeHead(500).end(error instanceof Error ? error.message : 'failed');
  }
});
await new Promise<void>((r) => control.listen(4422, '127.0.0.1', r));
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
console.log(
  JSON.stringify({
    trial: 'P21',
    web: origin,
    control: 'http://127.0.0.1:4422',
    secret,
    logins: Object.keys(users).map((u) => origin + '/api/test/p21-login/' + u),
    fixtures: runtime,
  }),
);
