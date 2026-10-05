import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { transferFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
const origin = 'http://127.0.0.1:5351',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const f = await transferFixture(db.pool, origin);
await mkdir('docs/verification/P15/screenshots', { recursive: true });
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['staffA', f.staffA],
  ['staffB', f.staffB],
] as const)
  server.get('/api/test/p15-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/');
  });
await app.listen(4351, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5351',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4351' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p15-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    a: f.a,
    b: f.b,
    driver: f.driver,
    brand: f.brand,
    variant: f.variant,
    parcel: f.parcel.shipmentId,
  }),
  { mode: 0o600 },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p15-runtime.json').catch(() => {});
  await app.close();
  await db.dispose();
  control.close();
  process.exit(0);
}
const control = createServer(async (req, res) => {
  if (req.url === '/health') {
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
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  res.writeHead(404).end();
});
control.listen(4352, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
