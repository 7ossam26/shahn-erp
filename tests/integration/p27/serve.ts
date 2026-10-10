import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { authoritativeRuntime } from '../../../apps/api/src/modules/integration/connection-provider.js';
import { setupFixture } from './setup-fixture.js';
const origin = 'http://127.0.0.1:5337',
  db = await isolatedPostgres(),
  secret = randomBytes(32).toString('hex');
await migrate(db.pool);
const f = await setupFixture(db.pool, origin),
  privateDir = await mkdtemp(join(tmpdir(), 'shahn-p27-browser-'));
await mkdir('docs/verification/P27/screenshots', { recursive: true });
await writeFile(join(privateDir, 'operator-package.json'), JSON.stringify(f.p), { mode: 0o600 });
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  authoritativeRuntime(db.pool, { connections: [] }, f.installation),
  { connectionSetup: f.service },
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['support', f.support],
  ['admin', f.admin],
] as const)
  server.get('/api/test/p27-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/integration');
  });
await app.listen(4337, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5337',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4337' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p27-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    packagePath: join(privateDir, 'operator-package.json'),
  }),
  { mode: 0o600 },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await rm(privateDir, { recursive: true });
  await unlink('tests/.p27-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
const control = createServer((req, res) => {
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
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (i === 99) {
    await stop();
    throw Error('P27_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4338, '127.0.0.1');
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
