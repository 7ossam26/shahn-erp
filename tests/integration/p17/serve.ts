import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { payoutFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
/**
 * Isolated owner trial (`npm run p17:trial`): disposable PostgreSQL, real API, Vite web.
 * Branches A/B, A Cash 1000, B Cash 1000, Company Test Bank 0. One shared brand receives the real
 * P12→P13→P16 goods 250 + shipping 50 journey, remitted 300 into the bank. Test-only logins exist
 * only here, never in the product app.
 */
const origin = 'http://127.0.0.1:5371',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const f = await payoutFixture(db.pool, origin);
const brand = await f.brand('براند التجربة المشترك', [f.weekdayToday]);
const delivered = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
await f.remit(delivered.scope);
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['payA', f.payA],
  ['payB', f.payB],
  ['staffA', f.staffA],
] as const)
  server.get('/api/test/p17-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/brand-payouts');
  });
await app.listen(4371, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5371',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4371' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await f.close();
  await db.dispose();
  control.close();
}
// Controls: reserve the known brand-paid shipping cover through the real P12 service, or add
// another unremitted delivery, so the owner can observe cover and pending money separately.
const control = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.end('ok');
    return;
  }
  if (req.headers['x-test-secret'] !== secret) {
    res.writeHead(403).end();
    return;
  }
  if (req.url === '/cover') {
    const d = await f.prepared([await f.create({ brandId: brand, shippingPayer: 'brand' })]);
    await f.commands.execute(
      f.admin.token,
      f.dispatchCommand({
        type: 'dispatch.receive',
        intentId: d.id,
        expectedVersion: d.version,
        receiptAsserted: true,
      }),
    );
    await f.completeNext();
  }
  if (req.url === '/pending') await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  res.end('ok');
});
await new Promise<void>((r) => control.listen(4372, '127.0.0.1', r));
process.stdout.write(
  `P17 trial ready: ${origin}/api/test/p17-login/payB (also payA, admin, staffA). Control secret: ${secret}\n`,
);
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
