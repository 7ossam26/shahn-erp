import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../apps/api/src/app.js';
import { accessFixture, fixtureConfig } from '../support/access.js';
import { cookie } from '../../apps/api/src/modules/access/http.js';
import { financeCommands } from '../../apps/api/src/modules/finance/service.js';
import { seedFinance } from '../../apps/api/src/modules/finance/seed.js';
const origin = 'http://127.0.0.1:5313',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await mkdir('docs/verification/P09/screenshots', { recursive: true });
await migrate(db.pool);
const f = await accessFixture(db.pool, fixtureConfig(origin));
await db.pool.query("UPDATE access.company SET name='P09 شركة التجربة' WHERE id=$1", [f.company]);
await db.pool.query(
  "INSERT INTO access.user_exception VALUES($1,$2,'expenses','allow'),($1,$2,'finance.movements','allow')",
  [f.company, f.staffB.id],
);
const seed = await seedFinance(db.pool, f.admin.token, f.company, { a: f.a, b: f.b }, 'test');
const commands = financeCommands(db.pool);
if (process.env['P09_MANUAL_TRIAL'] !== 'true')
  for (const [id, method] of [
    [seed.cash.entityId, 'cash'],
    [seed.bank.entityId, 'bank_deposit'],
  ] as const)
    await commands.execute(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'movement.create',
      fields: {
        accountId: id,
        branchId: f.b,
        currency: 'EGP',
        amountMinor: '100000',
        actualDate: '2026-09-01',
        method,
        direction: 'deposit',
        reason: '',
      },
    });
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user, route] of [
  ['admin', f.admin, '/finance/accounts'],
  ['staff-b', f.staffB, '/expenses'],
] as const)
  server.get('/api/test/p09-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect(route);
  });
await app.listen(4313, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5313',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4313' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p09-runtime.json',
  JSON.stringify({ companyId: f.company, branchA: f.a, branchB: f.b, seed, secret }),
  { mode: 0o600 },
);
await writeFile(
  `docs/verification/P09/seed-ids-${Date.now()}.json`,
  JSON.stringify(
    { companyId: f.company, branchA: f.a, branchB: f.b, seed, staffB: f.staffB.id },
    null,
    2,
  ),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p09-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
const control = createServer(async (req, res) => {
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
            `SELECT (SELECT amount_minor::text FROM finance.account_balance WHERE account_id=$1) AS cash,(SELECT count(*)::int FROM finance.money_movement WHERE account_id=$1) AS movements,(SELECT count(*)::int FROM finance.paid_expense WHERE account_id=$1) AS expenses`,
            [seed.cash.entityId],
          )
        ).rows[0],
      ),
    );
    return;
  }
  if (req.url === '/bump-cash') {
    const a = (
      await db.pool.query('SELECT version,name FROM finance.account WHERE id=$1', [
        seed.cash.entityId,
      ])
    ).rows[0];
    await commands.execute(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'account.update',
      accountId: seed.cash.entityId,
      expectedVersion: a.version,
      fields: {
        name: a.name,
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
  if (req.url === '/deactivate-bank') {
    const a = (
      await db.pool.query('SELECT version FROM finance.account WHERE id=$1', [seed.bank.entityId])
    ).rows[0];
    await commands.execute(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'account.deactivate',
      accountId: seed.bank.entityId,
      expectedVersion: a.version,
    });
    res.end('deactivated');
    return;
  }
  res.statusCode = 404;
  res.end();
});
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (i === 99) {
    await stop();
    throw Error('P09_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4314, '127.0.0.1');
if (process.env['P09_MANUAL_TRIAL'] === 'true')
  console.log(
    'Isolated P09 trial: http://127.0.0.1:5313/api/test/p09-login/admin — Ctrl+C stops and deletes the disposable fixture.',
  );
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
