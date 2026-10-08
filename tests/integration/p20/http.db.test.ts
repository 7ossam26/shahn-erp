import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { payrollFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof payrollFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  url: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await payrollFixture(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    { connections: [] },
    { payrollClock: f.clock },
  );
  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
});
it('HR filters select actual period states, carry and advance balances without widening branch scope', async () => {
  const e = await f.create('ترحيل للفلاتر', '300000');
  await f.issue(e.employeeId, '350000');
  const p = await f.read(e.employeeId);
  await f.service().execute(f.admin.token, f.command(p, { type: 'payroll.zero-close' }));
  const getList = async (filters: string, token = f.admin.token) => {
    const r = await fetch(url + '/api/v1/employees?companyId=' + f.company + '&' + filters, {
      headers: { cookie: 'erp_session=' + token },
    });
    return { status: r.status, body: await r.json() };
  };
  const zero = await getList(
    'payrollState=zero_net_closed&advanceStatus=outstanding&payrollMonth=' + f.month,
  );
  expect(zero.status).toBe(200);
  expect(zero.body.items.map((x: { id: string }) => x.id)).toEqual([e.employeeId]);
  const next = new Date(Date.UTC(Number(f.month.slice(0, 4)), Number(f.month.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 7);
  expect(
    (await getList('carry=yes&payrollMonth=' + next)).body.items.map((x: { id: string }) => x.id),
  ).toEqual([e.employeeId]);
  expect((await getList('branchId=' + f.a, f.staffB.token)).status).toBe(403);
  expect((await getList('payrollState=installment')).status).toBe(400);
});
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
it('closed actual HTTP: scope, CSRF, partial payout, supported funded method and unknown-command recovery', async () => {
  const e = await f.create(),
    p = await f.read(e.employeeId),
    path = `/api/v1/employees/${e.employeeId}/months/${f.month}`;
  const get = await fetch(url + path + '?companyId=' + f.company, {
    headers: { cookie: 'erp_session=' + f.admin.token },
  });
  expect(get.status).toBe(200);
  expect((await get.json()).calculation.salary).toBe('600000');
  const denied = await fetch(url + path + '?companyId=' + f.company, {
    headers: { cookie: 'erp_session=' + f.staffB.token },
  });
  expect(denied.status).toBe(403);
  const csrf = f.admin.csrfToken;
  const headers = {
    'Content-Type': 'application/json',
    cookie: 'erp_session=' + f.admin.token,
    origin: f.config.origin,
    'X-CSRF-Token': csrf,
  };
  const c = f.command(p, { type: 'payroll.payout', funding: f.funding });
  const partial = await fetch(url + path + '/payout', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...c, amountMinor: '1' }),
  });
  expect(partial.status).toBe(400);
  const wrong = await fetch(url + path + '/payout', {
    method: 'POST',
    headers: { ...headers, 'X-CSRF-Token': 'wrong' },
    body: JSON.stringify(c),
  });
  expect(wrong.status).toBe(403);
  const paid = await fetch(url + path + '/payout', {
    method: 'POST',
    headers,
    body: JSON.stringify(c),
  });
  expect(paid.status).toBe(200);
  const result = await paid.json();
  const recovered = await fetch(
    url + `/api/v1/employees/payroll/commands/${c.commandId}?companyId=${f.company}`,
    { headers: { cookie: 'erp_session=' + f.admin.token } },
  );
  expect(recovered.status).toBe(200);
  expect(await recovered.json()).toEqual(result);
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM employees.salary_payment WHERE company_id=$1 AND employee_id=$2',
        [f.company, e.employeeId],
      )
    ).rows[0].n,
  ).toBe(1);
});
