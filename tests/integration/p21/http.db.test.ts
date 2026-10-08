import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import {
  validateSettlementViews,
  type SettlementCommand,
  type SettlementOperation,
} from '@shahn/contracts';
import { settlementFixture } from './fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof settlementFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  url: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await settlementFixture(db.pool, 'http://127.0.0.1:5425');
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    { connections: [] },
    { payrollClock: f.payrollClock },
  );
  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
const headers = (token = f.admin.token, csrf = f.admin.csrfToken) => ({
  'Content-Type': 'application/json',
  cookie: 'erp_session=' + token,
  origin: f.config.origin,
  'X-CSRF-Token': csrf,
});
const get = async (path: string, token = f.admin.token) => {
  const r = await fetch(url + path, { headers: { cookie: 'erp_session=' + token } });
  return { status: r.status, body: await r.json() };
};
const post = async (path: string, body: unknown, h: Record<string, string> = headers()) => {
  const r = await fetch(url + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};

it('closed HTTP: prepare → confirm → recover; stale/denied/CSRF/injected payloads are rejected without effects', async () => {
  const v = await f.product(['Http']);
  await f.receive(v.Http!, 12);
  const operation: SettlementOperation = {
    operation: 'product.observe',
    branchId: f.a,
    brandId: f.seed.brand,
    variantId: v.Http!,
    condition: 'sound',
    observedQuantity: 10,
    actualDate: f.today,
  };
  const prepared = await post('/api/v1/settlements/prepare', { companyId: f.company, operation });
  expect(prepared.status).toBe(200);
  expect(validateSettlementViews.preview(prepared.body)).toBe(true);
  const command: SettlementCommand = {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'settlement.confirm',
    reason: 'جرد يدوي',
    operation,
    expectedVersions: prepared.body.versions,
    expectedDigest: prepared.body.digest,
  };
  // No CSRF / wrong origin / injected field / query string: rejected before any effect.
  expect(
    (await post('/api/v1/settlements/commands', command, { ...headers(), 'X-CSRF-Token': 'x' }))
      .status,
  ).toBe(403);
  expect(
    (await post('/api/v1/settlements/commands', command, { ...headers(), origin: 'http://evil' }))
      .status,
  ).toBe(403);
  expect(
    (await post('/api/v1/settlements/commands', { ...command, balanceMinor: '1' })).status,
  ).toBe(400);
  expect(
    (
      await post('/api/v1/settlements/commands', {
        ...command,
        operation: { ...operation, table: 'inventory.stock_position' },
      })
    ).status,
  ).toBe(400);
  // A user without the settlements grant cannot prepare.
  expect(
    (
      await post(
        '/api/v1/settlements/prepare',
        { companyId: f.company, operation },
        headers(f.staffA.token, f.staffA.csrfToken),
      )
    ).status,
  ).toBe(403);
  expect(await f.count('settlements.adjustment_case')).toBe(0);
  const confirmed = await post('/api/v1/settlements/commands', command);
  expect(confirmed.status).toBe(200);
  expect(validateSettlementViews.result(confirmed.body)).toBe(true);
  const recovered = await get(
    `/api/v1/settlements/commands/${command.commandId}?companyId=${f.company}`,
  );
  expect(recovered).toEqual({ status: 200, body: confirmed.body });
  expect(
    (await get(`/api/v1/settlements/commands/${randomUUID()}?companyId=${f.company}`)).status,
  ).toBe(404);
  // Same identity with a different payload conflicts; replaying the reviewed observation with a new
  // identity is a definite retained 409 (the position already equals the observed quantity).
  expect(
    (await post('/api/v1/settlements/commands', { ...command, reason: 'سبب آخر' })).status,
  ).toBe(409);
  const stale = await post('/api/v1/settlements/commands', { ...command, commandId: randomUUID() });
  expect(stale.status).toBe(409);
  expect(stale.body.code).toBe('NO_DIFFERENCE');
  expect(validateSettlementViews.error(stale.body)).toBe(true);
  const list = await get(
    `/api/v1/settlements/cases?companyId=${f.company}&state=resolved&targetKind=product`,
  );
  expect(list.status).toBe(200);
  expect(validateSettlementViews.list(list.body)).toBe(true);
  expect(list.body.items.map((x: { id: string }) => x.id)).toEqual([confirmed.body.caseId]);
  const detail = await get(
    `/api/v1/settlements/cases/${confirmed.body.caseId}?companyId=${f.company}`,
  );
  expect(validateSettlementViews.detail(detail.body)).toBe(true);
  expect(
    (
      await get(
        `/api/v1/settlements/cases/${confirmed.body.caseId}?companyId=${f.company}`,
        f.staffB.token,
      )
    ).status,
  ).toBe(403);
  expect(
    (await get(`/api/v1/settlements/cases?companyId=${f.company}&state=installment`)).status,
  ).toBe(400);
  const catalog = await get(`/api/v1/settlements/catalog?companyId=${f.company}`);
  expect(validateSettlementViews.catalog(catalog.body)).toBe(true);
});

it('opening HTTP: optional batch with closed preview/result, single replay and duplicate rejection', async () => {
  const account = await f.account('خزنة افتتاحية HTTP', 'cash', [f.a]);
  const lines = [
    { classification: 'account_balance', accountId: account, branchId: f.a, amountMinor: '50000' },
  ];
  const empty = await get(`/api/v1/settlements/opening/batches?companyId=${f.company}`);
  expect(empty).toEqual({ status: 200, body: { items: [] } });
  const preview = await post('/api/v1/settlements/opening/prepare', {
    companyId: f.company,
    openingDate: f.today,
    lines,
  });
  expect(preview.status).toBe(200);
  expect(validateSettlementViews.openingPreview(preview.body)).toBe(true);
  const command = {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'opening.confirm',
    openingDate: f.today,
    description: 'رصيد الخزنة عند بدء التشغيل',
    evidence: '',
    lines,
    expectedDigest: preview.body.digest,
  };
  const first = await post('/api/v1/settlements/opening/commands', command);
  expect(first.status).toBe(200);
  expect(validateSettlementViews.openingResult(first.body)).toBe(true);
  expect(await post('/api/v1/settlements/opening/commands', command)).toEqual(first);
  const dup = await post('/api/v1/settlements/opening/commands', {
    ...command,
    commandId: randomUUID(),
  });
  expect(dup.status).toBe(409);
  expect(dup.body.code).toBe('DUPLICATE_OPENING_TARGET');
  expect(await f.balance(account)).toBe('50000');
  const batches = await get(`/api/v1/settlements/opening/batches?companyId=${f.company}`);
  expect(batches.body.items).toHaveLength(1);
  const detail = await get(
    `/api/v1/settlements/opening/batches/${first.body.batchId}?companyId=${f.company}`,
  );
  expect(validateSettlementViews.openingDetail(detail.body)).toBe(true);
});

it('committed result survives a database restart and is recovered by the same command identity', async () => {
  const account = await f.account('خزنة إعادة التشغيل', 'cash', [f.a]);
  await f.deposit(account, '20000');
  const operation: SettlementOperation = {
    operation: 'account.observe',
    accountId: account,
    branchId: f.a,
    observedMinor: '15000',
    actualDate: f.today,
  };
  const p = await post('/api/v1/settlements/prepare', { companyId: f.company, operation });
  const command = {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'settlement.confirm',
    reason: 'عد الخزنة الفعلي',
    operation,
    expectedVersions: p.body.versions,
    expectedDigest: p.body.digest,
  };
  const committed = await post('/api/v1/settlements/commands', command);
  expect(committed.status).toBe(200);
  await db.stop();
  await db.start();
  // The pool reconnects; recovery returns the committed result and the hold survives.
  let recovered: { status: number; body: unknown } = { status: 0, body: null };
  for (let i = 0; i < 20 && recovered.status !== 200; i++) {
    recovered = await get(
      `/api/v1/settlements/commands/${command.commandId}?companyId=${f.company}`,
    ).catch(() => recovered);
    if (recovered.status !== 200) await new Promise((r) => setTimeout(r, 250));
  }
  expect(recovered).toEqual(committed);
  expect(
    (
      await db.pool.query(
        'SELECT active_minor::text FROM settlements.account_hold_balance WHERE company_id=$1 AND account_id=$2',
        [f.company, account],
      )
    ).rows,
  ).toEqual([{ active_minor: '5000' }]);
  expect(await post('/api/v1/settlements/commands', command)).toEqual(committed);
});
