import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { returnFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { createSession } from '../../../apps/api/src/modules/access/sessions.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { recordApprovedDisposition } from '../../../apps/api/src/modules/returns/disposition.service.js';
const origin = 'http://127.0.0.1:5341',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
const f = await returnFixture(db.pool, origin),
  x = await f.setup(),
  damaged = await f.setup(),
  sound = await f.setup();
await f.commands.execute(f.admin.token, f.receiveInput(damaged.request, 1, 'damaged'));
await f.accept();
await f.receipt(sound.request);
await UnitOfWork.run(db.pool, f.admin.token, f.company, 'returns', (u) =>
  recordApprovedDisposition(u, {
    decisionId: randomUUID(),
    incidentId: randomUUID(),
    requestId: damaged.request.requestId,
    branchId: f.a,
    disposition: 'lost',
    items: [{ itemId: damaged.request.items[0]!.itemId, expectedRevision: 1, quantity: 1 }],
  }),
);
// The sole branch-B user has the screen grant, but no access to source branch A.
await db.pool.query(
  `INSERT INTO access.role_grant(company_id,role_id,capability) SELECT company_id,role_id,'returns' FROM access.ordinary_user WHERE id=$1 ON CONFLICT DO NOTHING`,
  [f.staffB.id],
);
const staff = await createSession(
  db.pool,
  f.config,
  {
    issuer: f.config.issuer,
    subject: f.staffB.subject,
    mfa: false,
    authenticatedAt: new Date(),
    tokens: {},
  },
  'trial',
  false,
);
await mkdir('docs/verification/P14/screenshots', { recursive: true });
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  ),
  server = app.getHttpAdapter().getInstance();
for (const [name, user] of [
  ['admin', f.admin],
  ['staff', staff],
] as const)
  server.get('/api/test/p14-login/' + name, async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', user.token, 1800));
    return reply.redirect('/');
  });
await app.listen(4341, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5341',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4341' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p14-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    branch: f.a,
    otherBranch: f.b,
    driver: f.driver,
    request: x.request.requestId,
    damaged: damaged.request.requestId,
    sound: sound.request.requestId,
    shipment: x.s,
  }),
  { mode: 0o600 },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p14-runtime.json').catch(() => {});
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
  if (req.url === '/accept') {
    await f.accept();
    res.end('accepted');
    return;
  }
  res.writeHead(404).end();
});
control.listen(4342, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
