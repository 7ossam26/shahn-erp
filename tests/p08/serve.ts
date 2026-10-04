import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../apps/api/src/app.js';
import { accessFixture, fixtureConfig } from '../support/access.js';
import { cookie } from '../../apps/api/src/modules/access/http.js';
import { seedEmployees } from '../../apps/api/src/modules/employees/seed.js';
import { employeeCommands, employeeDetail } from '../../apps/api/src/modules/employees/service.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
const origin = 'http://127.0.0.1:5311',
  secret = randomBytes(32).toString('hex'),
  db = await isolatedPostgres();
await mkdir('docs/verification/P08', { recursive: true });
try {
  await migrate(db.pool);
} catch (e) {
  await db.dispose();
  throw e;
}
const f = await accessFixture(db.pool, fixtureConfig(origin));
await db.pool.query("INSERT INTO access.user_exception VALUES($1,$2,'employees','allow')", [
  f.company,
  f.staffA.id,
]);
const seed = await seedEmployees(db.pool, f.admin.token, f.company, f.a, 'test');
const seedB = await seedEmployees(db.pool, f.admin.token, f.company, f.b, 'test');
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  f.config,
);
const commands = employeeCommands(db.pool);
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/employees-login', async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', f.admin.token, 1800));
    return reply.redirect('/employees');
  });
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/employees-staff-login', async (_req, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', f.staffA.token, 1800));
    return reply.redirect('/employees');
  });
await app.listen(4311, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5311',
    '--strictPort',
  ],
  {
    env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:4311' },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p08-runtime.json',
  JSON.stringify({ companyId: f.company, seed, seedB, secret }),
  { mode: 0o600 },
);
await writeFile(
  `docs/verification/P08/seed-ids-${Date.now()}.json`,
  JSON.stringify({ seed, seedB, staffA: f.staffA.id }, null, 2),
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
  try {
    if (req.url === '/statistics') {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify(
          (
            await db.pool.query(
              'SELECT (SELECT count(*)::int FROM employees.employee) AS employees,(SELECT count(*)::int FROM employees.employee_driver_link) AS links,(SELECT count(*)::int FROM kernel.journal_effect) AS money',
            )
          ).rows[0],
        ),
      );
      return;
    }
    if (req.url === '/bump-salma') {
      const d = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', (u) =>
        employeeDetail(u, seed.salma.employeeId),
      );
      await commands.execute(f.admin.token, {
        type: 'employee.update',
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        employeeId: d.id,
        expectedVersion: d.version,
        fields: d.fields,
        branchEffectiveDate: null,
        reason: 'Other operator profile edit',
      });
      res.end('changed');
      return;
    }
    if (req.url === '/freeze-salma') {
      await db.pool.query(
        "UPDATE employees.payroll_period SET state='frozen_unpaid',version=version+1 WHERE company_id=$1 AND employee_id=$2 AND state='editable_unpaid'",
        [f.company, seed.salma.employeeId],
      );
      res.end('frozen');
      return;
    }
    if (req.url === '/revoke-a' || req.url === '/restore-a') {
      if (req.url === '/revoke-a')
        await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
          f.admin.id,
          f.a,
        ]);
      else
        await db.pool.query(
          'INSERT INTO access.user_branch VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [f.company, f.admin.id, f.a],
        );
      res.end('scope changed');
      return;
    }
    res.statusCode = 404;
    res.end();
  } catch {
    res.statusCode = 500;
    res.end('fixture command failed');
  }
});
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p08-runtime.json').catch(() => {});
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
control.listen(4312, '127.0.0.1');
if (process.env['P08_MANUAL_TRIAL'] === 'true')
  console.log(
    'Isolated P08 trial: http://127.0.0.1:5311/api/test/employees-login — Ctrl+C stops this fixture.',
  );
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
