import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../apps/api/src/app.js';
import { seedCommercial } from '../../apps/api/src/modules/brands/seed.js';
import { cookie } from '../../apps/api/src/modules/access/http.js';
import { accessFixture, fixtureConfig } from '../support/access.js';
const origin = 'http://127.0.0.1:5295',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const fixture = await accessFixture(db.pool, fixtureConfig(origin));
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  fixture.config,
);
const seed = await seedCommercial(db.pool, fixture.admin.token, fixture.company, fixture.a, 'test');
// This disposable harness alone exposes fixture login; the API application never does.
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/brands-login', async (_request, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', fixture.admin.token, 1800));
    return reply.redirect('/brands');
  });
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/brands-staff-login', async (_request, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', fixture.staffA.token, 1800));
    return reply.redirect('/');
  });
await writeFile(`docs/verification/P04/seed-ids-${Date.now()}.json`, JSON.stringify(seed, null, 2));
await app.listen(4295, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5295',
    '--strictPort',
  ],
  {
    env: {
      ...process.env,
      API_PROXY_TARGET: 'http://127.0.0.1:4295',
    },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p04-runtime.json',
  JSON.stringify({
    token: fixture.admin.token,
    companyId: fixture.company,
    csrfToken: fixture.admin.csrfToken,
    staffToken: fixture.staffA.token,
    seed,
    secret,
  }),
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
  await unlink('tests/.p04-runtime.json').catch(() => {});
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
control.listen(4296, '127.0.0.1');
if (process.env['P04_MANUAL_TRIAL'] === 'true')
  console.log(
    'Isolated test data: http://127.0.0.1:5295/api/test/brands-login — Ctrl+C stops and removes this fixture.',
  );
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
