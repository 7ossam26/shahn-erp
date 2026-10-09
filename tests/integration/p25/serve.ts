import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { accessFixture, fixtureConfig } from '../../support/access.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
const db = await isolatedPostgres();
await migrate(db.pool);
const f = await accessFixture(db.pool, fixtureConfig('http://127.0.0.1:5425'));
process.env['OPERATIONS_MODE'] = 'restore';
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  { connections: [] },
);
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/p25-login', async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', f.admin.token, 1800));
    return reply.redirect('/');
  });
await app.listen(4425, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5425',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4425' },
    stdio: 'inherit',
    windowsHide: true,
  },
);
let stopping = false;
const control = createServer((_req, res) => res.end('ready')).listen(4426, '127.0.0.1');
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  control.close();
  process.exit(0);
}
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
