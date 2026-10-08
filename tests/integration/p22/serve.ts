import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { executionFixture } from '../p13/fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { recoveryCommands } from '../../../apps/api/src/modules/integration/recovery.service.js';
import { RecoveryWorker } from '../../../apps/api/src/modules/integration/recovery-worker.js';
import {
  RecoveryClient,
  RecoveryFailure,
} from '../../../apps/api/src/modules/integration/recovery-client.js';
const origin = 'http://127.0.0.1:5422',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool, (await readMigrations()).slice(0, 16));
const f = await executionFixture(db.pool, origin);
await migrate(db.pool);
const x = await f.received();
await f.receive(
  f.event('outcome.recorded', { outcome: await x.outcome('no-answer') }, x.task.taskId, 3),
);
const commands = recoveryCommands(db.pool);
const job = (
  await commands.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'recovery.replay',
    aggregateType: 'task',
    aggregateId: x.task.taskId,
  })
).body as { jobId: string };
class Expired extends RecoveryClient {
  override async replay(): Promise<never> {
    throw new RecoveryFailure('history-expired', 'replay_expired', 410);
  }
}
await new RecoveryWorker(db.pool, f.runtime, () => new Expired(f.connection)).runOne();
await commands.execute(f.admin.token, {
  schemaVersion: 1,
  companyId: f.company,
  commandId: randomUUID(),
  type: 'recovery.reconcile',
  aggregateType: 'task',
  aggregateId: x.task.taskId,
});
const scoped = await f.make('p22-scoped', [f.a, f.b], f.adminRole);
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  ),
  server = app.getHttpAdapter().getInstance();
server.get('/api/test/p22-login', async (_req, reply) => {
  reply.header('Set-Cookie', cookie('erp_session', scoped.token, 1800));
  return reply.redirect('/integration/recovery');
});
await app.listen(4423, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5422',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4423' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await mkdir('docs/verification/P22/screenshots', { recursive: true });
await writeFile(
  'tests/.p22-runtime.json',
  JSON.stringify({ secret, companyId: f.company, jobId: job.jobId }),
  { mode: 0o600 },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p22-runtime.json').catch(() => {});
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
      `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='integration'`,
      [f.company, f.adminRole],
    );
    res.end('revoked');
    return;
  }
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  res.writeHead(404).end();
});
control.listen(4424, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
