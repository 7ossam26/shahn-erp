import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { SourceFailure } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { dispatchFixture } from './fixtures.js';
const origin = 'http://127.0.0.1:5321',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await mkdir('docs/verification/P12/screenshots', { recursive: true });
await migrate(db.pool);
const f = await dispatchFixture(db.pool, origin);
await f.credit(f.seed.brand);
const ordinary = await f.create({ recipientName: 'أحمد — شحنة عادية', comment: 'اتصل قبل الوصول' }),
  paid = await f.create({
    recipientName: 'شحنة شحنها على البراند',
    areaId: f.seed.dokki,
    shippingPayer: 'brand',
  }),
  long = await f.create({
    recipientName:
      'اسم مستلم طويل لاختبار القراءة على الهاتف وشاشات العمل الصغيرة دون فقد بيانات التسليم المهمة',
  });
await f.create({ service: 'company_packed', recipientName: 'شحنة لم يكتمل تجهيزها' });
const unknownShipment = await f.create({ recipientName: 'دفعة معلقة للتأكد من نتيجة الاستلام' }),
  unknown = await f.prepared([unknownShipment]);
await f.commands.execute(
  f.admin.token,
  f.command({
    type: 'dispatch.receive',
    intentId: unknown.id,
    expectedVersion: unknown.version,
    receiptAsserted: true,
  }),
);
const lease = (await f.worker.claim())!;
await f.worker.complete(lease, { failure: new SourceFailure('unknown', 'REMOTE_RESULT_UNKNOWN') });
// Keep the explicit unknown fixture out of unrelated progression until its own retry is selected.
await db.pool.query(
  `UPDATE work_item SET available_at=clock_timestamp()+interval '1 day' WHERE id=$1`,
  [lease.id],
);
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  ),
  server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['staff', f.staffA],
] as const)
  server.get('/api/test/p12-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/dispatch');
  });
await app.listen(4321, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5321',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4321' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p12-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    ordinary,
    paid,
    long,
    unknownId: unknown.id,
    driverId: f.driver,
  }),
  { mode: 0o600 },
);
await writeFile(
  'docs/verification/P12/seed-ids.json',
  JSON.stringify(
    { companyId: f.company, ordinary, paid, long, unknownId: unknown.id, driverId: f.driver },
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
  await unlink('tests/.p12-runtime.json').catch(() => {});
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
    if (req.url === '/advance') {
      for (let n = 0; n < 110; n++) {
        if (!(await f.completeNext())) break;
      }
      res.end('advanced');
      return;
    }
    if (req.url === '/revoke') {
      await db.pool.query(
        `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='dispatch'`,
        [f.company, f.adminRole],
      );
      res.end('revoked');
      return;
    }
    if (req.url === '/restore') {
      await db.pool.query(
        `INSERT INTO access.role_grant VALUES($1,$2,'dispatch') ON CONFLICT DO NOTHING`,
        [f.company, f.adminRole],
      );
      res.end('restored');
      return;
    }
    if (req.url === '/wallet') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(await f.wallet()));
      return;
    }
    res.statusCode = 404;
    res.end();
  } catch {
    res.statusCode = 500;
    res.end('fixture_failed');
  }
});
for (let n = 0; n < 100; n++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (n === 99) {
    await stop();
    throw Error('P12_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4322, '127.0.0.1');
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
