import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { reportFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { ExportWorker } from '../../../apps/api/src/modules/reporting/exports.js';
const origin = 'http://127.0.0.1:5423',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const f = await reportFixture(db.pool, origin);
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
const server = app.getHttpAdapter().getInstance();
server.get('/api/test/p23-login', async (req, reply) => {
  const actor = (req.query as { actor?: string }).actor;
  const user = actor === 'a' ? f.reportA : actor === 'tracking' ? f.trackingOnly : f.admin;
  reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
  return reply.redirect('/reports');
});
await app.listen(4425, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5423',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4425' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await mkdir('docs/verification/P23/screenshots', { recursive: true });
await writeFile(
  'tests/.p23-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    a: f.a,
    b: f.b,
    aCash: f.aCash,
    bCash: f.bCash,
    brand: f.brand,
    today: f.today,
  }),
  { mode: 0o600 },
);
const worker = new ExportWorker(db.pool);
let working: Promise<unknown> | undefined,
  stopping = false;
const poll = setInterval(() => {
  if (!working && !stopping) {
    working = worker.runOne().finally(() => {
      working = undefined;
    });
  }
}, 100);
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(poll);
  await working;
  web.kill();
  await f.close();
  await app.close();
  await db.dispose();
  await unlink('tests/.p23-runtime.json').catch(() => {});
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
  if (req.url === '/revoke') {
    await db.pool.query(
      `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='reports'`,
      [f.company, f.scopedRole],
    );
    res.end('revoked');
    return;
  }
  if (req.url === '/late') {
    await f.expense('1000', f.today, f.a, 'P23 browser late paid expense');
    res.end('recorded');
    return;
  }
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  res.writeHead(404).end();
});
control.listen(4426, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
