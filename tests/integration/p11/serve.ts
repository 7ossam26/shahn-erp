import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transaction, sourceByCompany, insertReceivedEvent } from '@shahn/database';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { integrationFixture, senderFixture } from './fixtures.js';
const origin = 'http://127.0.0.1:5317',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await mkdir('docs/verification/P11/screenshots', { recursive: true });
await migrate(db.pool);
const f = await integrationFixture(db.pool, origin);
const queued = await f.commands.execute(f.admin.token, {
  schemaVersion: 1,
  companyId: f.company,
  commandId: randomUUID(),
  type: 'integration.queue',
  operationId: 'branch.provision',
  nativeId: f.a,
  expectedVersion: 0,
  payload: { name: 'الفرع أ', enabled: true, location: null },
});
const actionId = (queued.body as { actionId: string }).actionId;
await db.pool.query(
  `UPDATE integration.source_command SET state='unknown',last_error='REMOTE_RESULT_UNKNOWN' WHERE action_id=$1`,
  [actionId],
);
const event = senderFixture('p25-task.snapshotAccepted');
await transaction(db.pool, async (c) => {
  const source = await sourceByCompany(c, f.company);
  await insertReceivedEvent(c, source!, event, Buffer.from(JSON.stringify(event)), {
    keyId: 'trial',
    deliveryTimestamp: String(Date.now()),
  });
});
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
const server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['staff', f.staffA],
] as const)
  server.get('/api/test/p11-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/integration');
  });
await app.listen(4317, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5317',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4317' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p11-runtime.json',
  JSON.stringify({ secret, companyId: f.company, actionId, eventId: event.eventId }),
  { mode: 0o600 },
);
await writeFile(
  'docs/verification/P11/seed-ids.json',
  JSON.stringify({ companyId: f.company, actionId, eventId: event.eventId }, null, 2),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p11-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
const control = createServer((req, res) => {
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
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (i === 99) {
    await stop();
    throw Error('P11_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4318, '127.0.0.1');
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
