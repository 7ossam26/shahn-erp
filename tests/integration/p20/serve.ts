import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { payrollFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { cookie } from '../../../apps/api/src/modules/access/http.js';
import { incidentFixture } from '../p18/fixtures.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import type { FinanceResult } from '@shahn/contracts';
const origin = 'http://127.0.0.1:5401',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await migrate(db.pool);
const source = await incidentFixture(db.pool, origin);
const f = await payrollFixture(db.pool, origin, source);
const salary = await f.create('سلمى — الراتب الشهري والسلفة والخصم'),
  zero = await f.create('عمرو — الترحيل وإقفال الصفر', '300000'),
  stale = await f.create('ليلى — مراجعة حساب تغير قبل الدفع'),
  long = await f.create('موظف لديه سجل إضافات وخصومات طويل للمراجعة');
for (let n = 0; n < 18; n++) await f.adjustment(long.employeeId, String(1000 + n), 'bonus');
const sourceVisit = async () => {
  const visit = await source.received({ service: 'company_packed' }),
    arrival = visit.arrival();
  await source.receive(arrival);
  for (let n = 0; n < 12; n++) if (!(await source.worker.runOne())) break;
  return { eventId: arrival.eventId, shipmentId: visit.s.shipmentId };
};
const firstVisit = await sourceVisit();
const money = financeCommands(db.pool),
  sourceCash = (
    (
      await money.execute(source.admin.token, {
        schemaVersion: 1,
        companyId: source.company,
        commandId: randomUUID(),
        type: 'account.create',
        fields: {
          name: 'خزنة عمولة الزيارات',
          type: 'cash',
          currency: 'EGP',
          branchIds: [source.a],
          active: true,
          bankDescription: '',
        },
      })
    ).body as FinanceResult
  ).entityId;
await money.execute(source.admin.token, {
  schemaVersion: 1,
  companyId: source.company,
  commandId: randomUUID(),
  type: 'movement.create',
  fields: {
    accountId: sourceCash,
    branchId: source.a,
    currency: 'EGP',
    amountMinor: '1000000',
    actualDate: f.now.today,
    method: 'cash',
    direction: 'deposit',
    reason: 'أموال اختبار مصدر العمولة',
  },
});
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
  { connections: [] },
  { payrollClock: f.clock },
);
const api = app.getHttpAdapter().getInstance();
api.get('/api/test/p20-login', async (_req, reply) => {
  reply.header('Set-Cookie', cookie('erp_session', f.admin.token, 1800));
  return reply.redirect(`/employees/${salary.employeeId}/months/${f.month}`);
});
api.get('/api/test/p20-source-login', async (_req, reply) => {
  reply.header('Set-Cookie', cookie('erp_session', source.admin.token, 1800));
  return reply.redirect(`/employees/${source.employee.employeeId}/months/${f.month}`);
});
await app.listen(4401, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5401',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4401' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await mkdir('docs/verification/P20/screenshots', { recursive: true });
const fixture = {
  secret,
  company: f.company,
  branch: f.a,
  cash: f.cash,
  bank: f.bank,
  month: f.month,
  today: f.now.today,
  salary: salary.employeeId,
  zero: zero.employeeId,
  stale: stale.employeeId,
  long: long.employeeId,
  sourceCompany: source.company,
  sourceEmployee: source.employee.employeeId,
  sourceCash,
  firstVisit,
};
await writeFile('tests/.p20-runtime.json', JSON.stringify(fixture), { mode: 0o600 });
await writeFile(
  'docs/verification/P20/browser-fixtures.json',
  JSON.stringify({ ...fixture, secret: undefined }, null, 2),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await unlink('tests/.p20-runtime.json').catch(() => {});
  await app.close();
  await db.dispose();
  control.close();
  process.exit(0);
}
const control = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/health') {
    try {
      const ready = await fetch(origin);
      res.writeHead(ready.ok ? 200 : 503).end('ready');
    } catch {
      res.writeHead(503).end();
    }
    return;
  }
  if (req.headers['x-test-secret'] !== secret) {
    res.writeHead(403).end();
    return;
  }
  try {
    let result: unknown;
    if (url.pathname === '/stop') {
      res.end('stopping');
      void stop();
      return;
    } else if (url.pathname === '/late-source') result = await sourceVisit();
    else if (url.pathname === '/adjust')
      result = await f.adjustment(url.searchParams.get('employee')!, '1000', 'bonus');
    else if (url.pathname === '/clock') {
      f.now.today = url.searchParams.get('today')!;
      result = { today: f.now.today };
    } else if (url.pathname === '/reconcile')
      result = (
        await db.pool.query(
          `SELECT (SELECT count(*) FROM employees.salary_payment WHERE company_id=$1) payments,(SELECT count(*) FROM employees.advance WHERE company_id=$1) advances,(SELECT count(*) FROM finance.money_movement WHERE company_id=$1 AND source_kind IN ('employee_advance','salary_payout')) movements,(SELECT count(*) FROM employees.obligation_balance WHERE company_id=$1 AND (outstanding_amount<0 OR available_for_new_allocation<0)) invalid`,
          [f.company],
        )
      ).rows[0];
    else {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (e) {
    res.writeHead(500).end(e instanceof Error ? e.message : 'failed');
  }
});
await new Promise<void>((r) => control.listen(4402, '127.0.0.1', r));
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
console.log('P20 isolated trial ready at ' + origin + '/api/test/p20-login');
