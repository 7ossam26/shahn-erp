import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { remittanceFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
const origin = 'http://127.0.0.1:5361',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const f = await remittanceFixture(db.pool, origin),
  trial = await f.makeRound();
await mkdir('docs/verification/P16/screenshots', { recursive: true });
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['staffB', f.staffB],
] as const)
  server.get('/api/test/p16-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/');
  });
await app.listen(4361, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5361',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4361' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p16-runtime.json',
  JSON.stringify({ secret, ...trial.scope, accounts: f.accounts }),
  { mode: 0o600 },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p16-runtime.json').catch(() => {});
  await app.close();
  await f.close();
  await db.dispose();
  control.close();
}
const control = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.end('ok');
    return;
  }
  if (req.headers['x-test-secret'] !== secret) {
    res.writeHead(403).end();
    return;
  }
  if (req.url === '/mode/gap') f.setMode('missing-page');
  if (req.url === '/mode/ok') f.setMode('ok');
  if (req.url === '/correction') await f.correct(trial.round);
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  res.end('ok');
});
await new Promise<void>((r) => control.listen(4362, '127.0.0.1', r));
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
