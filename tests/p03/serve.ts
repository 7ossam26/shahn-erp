import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication, DatabaseLifecycle } from '../../apps/api/src/app.js';
import { registerKernel } from '../../apps/api/src/modules/kernel/http.js';
import { cookie } from '../../apps/api/src/modules/access/http.js';
import { accessFixture, fixtureConfig } from '../support/access.js';
const origin = 'http://127.0.0.1:5293',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const fixture = await accessFixture(db.pool, fixtureConfig(origin));
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  fixture.config,
);
registerKernel(app.getHttpAdapter().getInstance(), app.get(DatabaseLifecycle).pool, 'test', origin);
// This disposable harness alone exposes fixture login; the API application never does.
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/kernel-login', async (_request, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', fixture.admin.token, 1800));
    return reply.redirect('/development/kernel');
  });
await app.listen(4293, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5293',
    '--strictPort',
  ],
  {
    env: {
      ...process.env,
      API_PROXY_TARGET: 'http://127.0.0.1:4293',
      VITE_ENABLE_KERNEL_TRIAL: 'true',
    },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p03-runtime.json',
  JSON.stringify({ token: fixture.admin.token, companyId: fixture.company, secret }),
  { mode: 0o600 },
);
let stopping = false;
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
  res.statusCode = 404;
  res.end();
});
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p03-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (i === 99) {
    await stop();
    throw Error('TRIAL_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4294, '127.0.0.1');
if (process.env['P03_MANUAL_TRIAL'] === 'true')
  console.log(
    'Isolated test data: http://127.0.0.1:5293/api/test/kernel-login — Ctrl+C stops and removes this fixture.',
  );
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
