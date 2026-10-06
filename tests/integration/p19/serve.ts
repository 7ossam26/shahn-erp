import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { StoragePaymentCommand } from '@shahn/contracts';
import { storageFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
/**
 * P19 isolated trial: disposable PostgreSQL, real API (controlled storage business date), real
 * web app, real P04 brand setup, real P09 accounts funded by real deposits, and the real durable
 * renewal service driven on demand. Never touches a non-test database or real money.
 */
const origin = 'http://127.0.0.1:5391',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
const f = await storageFixture(db.pool, origin);
f.clock.today = '2027-01-01';
const partial = await f.brand(
  'براند التخزين الجزئي — مخزون في الفرعين أ وب',
  '2027-01-20',
  '31000',
  f.a,
);
const advance = await f.brand('براند الدفع المقدم للتخزين', '2027-02-01', '31000', f.a);
const leap = await f.brand('براند نهاية الشهر', '2027-01-31', '31000', f.b);
await mkdir('docs/verification/P19/screenshots', { recursive: true });
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    { connections: [] },
    { storageClock: f.storageClock },
  ),
  server = app.getHttpAdapter().getInstance();
const users = {
  admin: f.admin,
  storA: f.storA,
  storB: f.storB,
  storAB: f.storAB,
  staffA: f.staffA,
};
server.get('/api/test/p19-login/:who', async (req, reply) => {
  const who = (req.params as { who: keyof typeof users }).who;
  if (!users[who]) return reply.code(404).send({});
  reply.header('Set-Cookie', cookie('erp_session', users[who].token, 1800));
  return reply.redirect('/storage');
});
await app.listen(4391, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5391',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4391' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p19-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    branchA: f.a,
    branchB: f.b,
    aCash: f.aCash,
    bCash: f.bCash,
    bank: f.bank,
    partial,
    advance,
    leap,
  }),
  { mode: 0o600 },
);
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM storage.period WHERE company_id=$1) periods,
       (SELECT count(*)::int FROM storage.receipt WHERE company_id=$1) receipts,
       (SELECT count(*)::int FROM storage.allocation WHERE company_id=$1) allocations,
       (SELECT count(*)::int FROM storage.refund WHERE company_id=$1) refunds,
       (SELECT count(*)::int FROM finance.money_movement WHERE company_id=$1 AND source_kind IN ('storage_receipt','storage_refund')) movements,
       (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1 AND family='brand') "walletEffects",
       (SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$2) "aCash",
       (SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$3) "bCash",
       (SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$4) "bank"`,
      [f.company, f.aCash, f.bCash, f.bank],
    )
  ).rows[0];
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p19-runtime.json').catch(() => {});
  await app.close();
  await db.dispose();
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
    if (url.pathname === '/stop') {
      res.end('stopping');
      void stop();
    } else if (url.pathname === '/counts') json(res, await counts());
    else if (url.pathname === '/clock') {
      const today = url.searchParams.get('today');
      if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('INVALID_DATE');
      f.clock.today = today;
      json(res, { today });
    } else if (url.pathname === '/renew') json(res, await f.renewAll());
    else if (url.pathname === '/external-payment') {
      // A competing actual receipt by another user, to make a reviewed preview stale.
      const brandId = url.searchParams.get('brand')!;
      const s = f.scope(brandId, f.a, f.aCash, url.searchParams.get('amount') ?? '1000');
      const preview = await f.service().paymentPreview(f.storA.token, s);
      const command: StoragePaymentCommand = {
        ...s,
        schemaVersion: 1,
        type: 'storage.payment.record',
        commandId: randomUUID(),
        expectedCreditVersion: preview.creditVersion,
        confirmReceived: true,
      };
      json(res, (await f.service().recordPayment(f.storA.token, command)).body);
    } else if (url.pathname === '/branch') {
      // Revoke/restore one assignment to exercise denied account authority after page load.
      const user = users[url.searchParams.get('user') as keyof typeof users]!,
        branch = url.searchParams.get('branch') === 'A' ? f.a : f.b;
      if (url.searchParams.get('assign') === 'true')
        await db.pool.query(
          `INSERT INTO access.user_branch VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
          [f.company, user.id, branch],
        );
      else
        await db.pool.query(
          `DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2 AND branch_id=$3`,
          [f.company, user.id, branch],
        );
      json(res, { ok: true });
    } else if (url.pathname === '/reconcile') json(res, await f.reconcile());
    else res.writeHead(404).end();
  } catch (error) {
    res.writeHead(500).end(error instanceof Error ? error.message : 'failed');
  }
});
await new Promise<void>((r) => control.listen(4392, '127.0.0.1', r));
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
console.log(
  JSON.stringify({
    trial: 'P19',
    web: origin,
    control: 'http://127.0.0.1:4392',
    secret,
    logins: Object.keys(users).map((u) => origin + '/api/test/p19-login/' + u),
  }),
);
