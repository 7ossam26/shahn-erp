import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { returnFixture } from '../p14/fixtures.js';
import { returnedParcel, moveReturnedParcel } from './returned-parcel-fixture.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
const origin = 'http://127.0.0.1:5351',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
const f = await returnFixture(db.pool, origin);
await db.pool.query(
  `UPDATE integration.source SET configuration=configuration||'{"interopVersion":"2.0.0","supportedVersions":["1.0.0","2.0.0"]}'::jsonb WHERE company_id=$1`,
  [f.company],
);
const x = await returnedParcel(db.pool, f, 'repeated');
await moveReturnedParcel(db.pool, f, x.s.shipmentId);
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  f.runtime,
);
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/parcel-login', async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', f.admin.token, 1800));
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
await mkdir('../integration-audit-2026-10-11/returns-screenshots', { recursive: true });
await writeFile(
  'tests/.returned-parcel-runtime.json',
  JSON.stringify({
    secret,
    company: f.company,
    branch: f.b,
    request: x.request.requestId,
    shipment: x.s.shipmentId,
  }),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.returned-parcel-runtime.json');
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
  if (req.url === '/redispatch') {
    await f.redispatch();
    await f.completeNext();
    res.end('prepared');
    return;
  }
  if (req.url === '/facts') {
    const cycle = (
      await db.pool.query(
        'SELECT id,current_intent_id FROM dispatch.cycle WHERE shipment_id=$1 AND latest',
        [x.s.shipmentId],
      )
    ).rows[0];
    const item = (
      await db.pool.query('SELECT snapshot,price FROM dispatch.item WHERE cycle_id=$1', [cycle.id])
    ).rows[0];
    const allocations = (
      await db.pool.query(
        'SELECT quantity FROM dispatch.transferred_return_allocation WHERE cycle_id=$1 ORDER BY quantity',
        [cycle.id],
      )
    ).rows;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ...item, allocations }));
    return;
  }
  res.writeHead(404).end();
});
control.listen(4352, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
