import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, employeeClock } from '@shahn/database';
import { incidentFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
const origin = 'http://127.0.0.1:5381',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
// Real P12 dispatch/P13 outcome services; source acceptance is the labelled controlled fixture.
const f = await incidentFixture(db.pool, origin),
  full = await f.shipment(),
  partial = await f.shipment();
// P20 does not exist yet: the current month is frozen exactly as the P18 DB protected-period case.
const month = (await employeeClock(db.pool)).month;
await db.pool.query(
  `INSERT INTO employees.payroll_period(company_id,employee_id,month,state) VALUES($1,$2,$3,'frozen_unpaid') ON CONFLICT(company_id,employee_id,month) DO UPDATE SET state='frozen_unpaid',version=employees.payroll_period.version+1`,
  [f.company, f.employee.employeeId, month + '-01'],
);
// The report form records minute-precision observation time; the historical employee resolver
// correctly rejects instants before the seeded profile existed, so start after the next minute.
await new Promise((r) => setTimeout(r, 60000 - (Date.now() % 60000) + 1000));
await mkdir('docs/verification/P18/screenshots', { recursive: true });
const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  ),
  server = app.getHttpAdapter().getInstance();
server.get('/api/test/p18-login/admin', async (_req, reply) => {
  reply.header('Set-Cookie', cookie('erp_session', f.admin.token, 1800));
  return reply.redirect('/');
});
await app.listen(4381, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5381',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4381' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p18-runtime.json',
  JSON.stringify({
    secret,
    companyId: f.company,
    branchA: f.a,
    brandId: f.seed.brand,
    cairo: f.seed.cairo,
    employeeId: f.employee.employeeId,
    protectedMonth: month,
    full: full.s.shipmentId,
    partial: partial.s.shipmentId,
  }),
  { mode: 0o600 },
);
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1) effects,(SELECT count(*)::int FROM kernel.credit_lot WHERE company_id=$1) lots,(SELECT count(*)::int FROM employees.incident_obligation WHERE company_id=$1) obligations,(SELECT count(*)::int FROM incidents.confirmation WHERE company_id=$1) confirmations,(SELECT count(*)::int FROM finance.money_movement WHERE company_id=$1) cash`,
      [f.company],
    )
  ).rows[0];
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p18-runtime.json').catch(() => {});
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
  if (req.url === '/counts') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(await counts()));
    return;
  }
  res.writeHead(404).end();
});
await new Promise<void>((r) => control.listen(4382, '127.0.0.1', r));
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
