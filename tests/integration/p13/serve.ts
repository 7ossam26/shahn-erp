import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { executionFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
const origin = 'http://127.0.0.1:5331',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
const f = await executionFixture(db.pool, origin);
const x = await f.received({
  service: 'company_packed',
  recipientName: 'أحمد — متابعة وصول دون رد',
});
await f.receive(x.arrival());
await f.worker.runOne();
const o = await x.outcome('no-answer');
await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 2));
await f.worker.runOne();
const long = await f.create({
  recipientName:
    'اسم المستلم الطويل لاختبار القراءة على الهاتف وشاشات العمل الصغيرة دون فقد بيانات التسليم المهمة',
  address:
    'القاهرة — عنوان طويل للتأكد من وضوح التفاصيل وإمكانية قراءة العنوان كاملاً دون تمرير أفقي '.repeat(
      3,
    ),
});
const pending = await f.received({ recipientName: 'شحنة بانتظار وصول الدليل' });
const p = await pending.outcome('full');
await f.receive(f.event('outcome.recorded', { outcome: p }, pending.task.taskId, 3));
await mkdir('docs/verification/P13/screenshots', { recursive: true });
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  ),
  server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['staff', f.staffB],
] as const)
  server.get('/api/test/p13-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/');
  });
await app.listen(4331, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5331',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4331' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p13-runtime.json',
  JSON.stringify({ secret, companyId: f.company, shipment: x.s, long, pending: pending.s }),
  { mode: 0o600 },
);
await writeFile(
  'docs/verification/P13/seed-ids.json',
  JSON.stringify({ companyId: f.company, shipment: x.s, long, pending: pending.s }, null, 2),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p13-runtime.json').catch(() => {});
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
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  res.writeHead(404).end();
});
control.listen(4332, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
