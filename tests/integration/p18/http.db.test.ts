import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { validateIncidentViews, type IncidentResult } from '@shahn/contracts';
import { createApplication } from '../../../apps/api/src/app.js';
import { incidentFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof incidentFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await incidentFixture(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
async function http(
  path: string,
  body?: unknown,
  who = f.admin,
  headers: Record<string, string> = {},
) {
  const r = await fetch(origin + '/api/v1/incidents' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: 'erp_session=' + who.token,
      ...(body
        ? {
            'Content-Type': 'application/json',
            Origin: f.config.origin,
            'X-CSRF-Token': who.csrfToken,
          }
        : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}
const q = () => '?companyId=' + f.company;
it('real HTTP report → preview → confirm → durable recovery; grant, branch, CSRF and closed inputs enforced', async () => {
  expect((await http('/catalog' + q(), undefined, { ...f.admin, token: '' })).status).toBe(401);
  expect((await http('/catalog' + q(), undefined, f.staffA)).status).toBe(403);
  const role = randomUUID();
  await db.pool.query(
    `INSERT INTO access.role(company_id,id,name) VALUES($1,$2,'مراجعة الحوادث')`,
    [f.company, role],
  );
  await db.pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'incidents')`,
    [f.company, role],
  );
  const onlyB = await f.make('incident-b', [f.b], role),
    onlyA = await f.make('incident-a', [f.a], role);
  const x = await f.shipment(),
    template = await f.report(x.s.shipmentId, { quantity: 1 }),
    d = await f.incidentDetail(template.result.incidentId);
  const input = { ...template.input, commandId: randomUUID() };
  if (input.type !== 'incident.report') throw Error('report');
  input.report.items[0]!.offset = 1;
  expect((await http('', input, f.admin, { 'X-CSRF-Token': 'wrong' })).status).toBe(403);
  expect((await http('', { ...input, shippingDue: 0 })).status).toBe(400);
  expect((await http('', input, onlyB)).status).toBe(403);
  const report = await http('', input, onlyA);
  expect(report.status).toBe(200);
  expect(validateIncidentViews.result!(report.body)).toBe(true);
  const result = report.body as unknown as IncidentResult;
  expect((await http('/' + result.incidentId + q(), undefined, onlyB)).status).toBe(403);
  expect((await http(q() + '&unexpected=1')).status).toBe(400);
  const c = f.confirmation({
    goodsValueMinor: '20000',
    compensationMinor: '20000',
    companyShareMinor: '10000',
    employeeShareMinor: '10000',
  });
  const p = await http(
    '/' + result.incidentId + '/confirmation-preview',
    { companyId: f.company, confirmation: c },
    onlyA,
  );
  expect(p.status).toBe(200);
  expect(p.body.blockers).toEqual([]);
  const cmd = f.incidentCommand({
    type: 'incident.confirm',
    incidentId: result.incidentId,
    confirmation: c,
  });
  // Discard the first HTTP response body; recovery must identify the same committed command.
  expect((await http('/' + result.incidentId + '/confirm', cmd, onlyA)).status).toBe(200);
  const recovered = await http('/commands/' + cmd.commandId + q(), undefined, onlyA);
  expect(recovered.status).toBe(200);
  expect(await http('/' + result.incidentId + '/confirm', cmd, onlyA)).toEqual(recovered);
  const committed = await http('/' + result.incidentId + q(), undefined, onlyA);
  expect(validateIncidentViews.detail!(committed.body)).toBe(true);
  expect((await http(q(), undefined, onlyB)).body.items).toEqual([]);
  await db.pool.query('DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2', [
    f.company,
    role,
  ]);
  expect((await http('/commands/' + cmd.commandId + q(), undefined, onlyA)).status).toBe(403);
  expect(d.report.items[0]!.quantity).toBe(1);
});
