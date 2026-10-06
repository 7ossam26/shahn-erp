import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { openApi, validateStorageViews, type StoragePaymentPreview } from '@shahn/contracts';
import { createApplication } from '../../../apps/api/src/app.js';
import { storageFixture, type StorageFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: StorageFixture,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin = '';
let b: Awaited<ReturnType<StorageFixture['brand']>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await storageFixture(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    { connections: [] },
    { storageClock: f.storageClock },
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
  f.clock.today = '2027-01-20';
  b = await f.brand('براند واجهة التخزين', '2027-01-20', '31000', f.a);
  await f.renewAll();
}, 120000);
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
type Who = { token: string; csrfToken: string };
async function http(
  path: string,
  body?: unknown,
  who: Who = f.admin,
  headers: Record<string, string> = {},
) {
  const r = await fetch(origin + '/api/v1/storage' + path, {
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
const q = (extra = '') => '?companyId=' + f.company + extra;
it('reads are session-bound, grant-scoped, closed and contract-valid', async () => {
  expect((await http('/agreements' + q(), undefined, { token: '', csrfToken: '' })).status).toBe(
    401,
  );
  expect(
    (await http('/agreements' + q(), undefined, f.admin, { Authorization: 'Bearer x' })).status,
  ).toBe(403);
  expect((await http('/agreements' + q(), undefined, f.staffA)).status).toBe(403);
  expect((await http('/agreements' + q('&unknown=1'), undefined, f.storB)).status).toBe(400);
  expect(
    (await http('/agreements' + q('&dueFrom=2027-02-01&dueTo=2027-01-01'), undefined, f.storB))
      .status,
  ).toBe(400);
  expect((await http('/agreements' + q('&branchId=' + f.foreign), undefined, f.storB)).status).toBe(
    403,
  );
  const list = await http(
    '/agreements' + q('&branchId=' + f.a + '&payment=unpaid'),
    undefined,
    f.storB,
  );
  expect(list.status).toBe(200);
  expect(validateStorageViews.list(list.body)).toBe(true);
  expect(list.body).toMatchObject({
    today: '2027-01-20',
    items: [{ agreementId: b.agreementId, branchId: f.a, charges: { outstandingMinor: '31000' } }],
  });
  const detail = await http('/agreements/' + b.agreementId + q(), undefined, f.storB);
  expect(detail.status).toBe(200);
  expect(validateStorageViews.detail(detail.body)).toBe(true);
  expect((await http('/agreements/' + randomUUID() + q(), undefined, f.storB)).status).toBe(404);
  expect((await http('/agreements/not-a-uuid' + q(), undefined, f.storB)).status).toBe(400);
  const catalog = await http('/catalog' + q(), undefined, f.storB);
  expect(validateStorageViews.catalog(catalog.body)).toBe(true);
  expect(catalog.body).toMatchObject({ branches: [{ id: f.b }] });
  expect((catalog.body.accounts as { id: string }[]).map((a) => a.id).sort()).toEqual(
    [f.bCash, f.bank, f.emptyBank].sort(),
  );
});
it('no public endpoint can generate an arbitrary period', async () => {
  for (const path of ['/periods', '/agreements/' + b.agreementId + '/periods', '/renewals'])
    expect((await http(path, { companyId: f.company })).status).toBe(404);
});
it('payment preview/command enforce CSRF, closed input, retained results and recovery', async () => {
  const scope = {
    companyId: f.company,
    brandId: b.brandId,
    branchId: f.b,
    accountId: f.bCash,
    method: 'cash',
    amountMinor: '10000',
    actualDate: '2027-01-20',
  };
  expect((await http('/payments/preview', scope, { ...f.storB, csrfToken: 'x' })).status).toBe(403);
  expect(
    (await http('/payments/preview', scope, f.storB, { Origin: 'http://evil.test' })).status,
  ).toBe(403);
  for (const forged of [
    { amountMinor: '100.5' },
    { amountMinor: '0' },
    { amountMinor: '-1' },
    { allocations: [] },
    { revenueMinor: '31000' },
    { periodId: randomUUID() },
  ])
    expect((await http('/payments/preview', { ...scope, ...forged }, f.storB)).status).toBe(400);
  const preview = await http('/payments/preview', scope, f.storB);
  expect(preview.status).toBe(200);
  expect(validateStorageViews.paymentPreview(preview.body)).toBe(true);
  const p = preview.body as unknown as StoragePaymentPreview;
  expect(p).toMatchObject({
    outstandingAfterMinor: '21000',
    allocations: [{ amountMinor: '10000' }],
  });
  // A user may only receive at an assigned branch.
  expect((await http('/payments/preview', { ...scope, branchId: f.a }, f.storB)).status).toBe(403);
  const command = {
    ...scope,
    schemaVersion: 1,
    type: 'storage.payment.record',
    commandId: randomUUID(),
    expectedCreditVersion: p.creditVersion,
    confirmReceived: true,
  };
  expect((await http('/payments', { ...command, confirmReceived: false }, f.storB)).status).toBe(
    400,
  );
  const first = await http('/payments', command, f.storB);
  expect(first.status).toBe(200);
  expect(validateStorageViews.paymentResult(first.body)).toBe(true);
  const replay = await http('/payments', command, f.storB);
  expect(replay).toEqual(first);
  const conflict = await http('/payments', { ...command, amountMinor: '10001' }, f.storB);
  expect(conflict).toMatchObject({ status: 409, body: { code: 'COMMAND_PAYLOAD_CONFLICT' } });
  const recovered = await http('/payments/commands/' + command.commandId + q(), undefined, f.storB);
  expect(recovered).toEqual(first);
  expect(
    (await http('/payments/commands/' + command.commandId + q(), undefined, f.storA)).status,
  ).toBe(404);
  // A stale reviewed credit version is a retained, contract-shaped rejection.
  const stale = await http('/payments', { ...command, commandId: randomUUID() }, f.storB);
  expect(stale.status).toBe(409);
  expect(validateStorageViews.error(stale.body)).toBe(true);
  expect(stale.body).toMatchObject({
    code: 'STORAGE_CREDIT_CHANGED',
    details: { creditVersion: p.creditVersion + 1 },
  });
  // The actual-money movement history shows the storage receipt with its own kind.
  const movements = await fetch(
    origin + '/api/v1/finance/movements?companyId=' + f.company + '&accountId=' + f.bCash,
    {
      headers: { Cookie: 'erp_session=' + f.admin.token },
    },
  );
  const m = (await movements.json()) as { items: { sourceKind: string }[] };
  expect(m.items.map((x) => x.sourceKind)).toContain('storage_receipt');
});
it('refund and stop flows are separate, versioned and recoverable', async () => {
  const scope = {
    companyId: f.company,
    brandId: b.brandId,
    branchId: f.a,
    accountId: f.aCash,
    method: 'cash',
    amountMinor: '5000',
    actualDate: '2027-01-20',
  };
  const preview = await http('/credit-refunds/preview', scope, f.storA);
  expect(preview.status).toBe(200);
  expect(validateStorageViews.refundPreview(preview.body)).toBe(true);
  expect(preview.body).toMatchObject({
    blockers: ['STORAGE_CREDIT_ALLOCATED'],
    unallocatedAfterMinor: null,
  });
  const refused = await http(
    '/credit-refunds',
    {
      ...scope,
      schemaVersion: 1,
      type: 'storage.credit.refund',
      commandId: randomUUID(),
      reason: 'محاولة استرداد مبلغ مخصص',
      expectedCreditVersion: preview.body.creditVersion,
      confirmCashOut: true,
    },
    f.storA,
  );
  expect(refused).toMatchObject({ status: 409, body: { code: 'STORAGE_CREDIT_ALLOCATED' } });
  expect(validateStorageViews.error(refused.body)).toBe(true);
  const stopPreview = await http(
    '/agreements/' + b.agreementId + '/stop/preview' + q(),
    undefined,
    f.storA,
  );
  expect(stopPreview.status).toBe(200);
  expect(validateStorageViews.stopPreview(stopPreview.body)).toBe(true);
  expect(stopPreview.body).toMatchObject({
    stopBoundary: '2027-02-20',
    lastServiceDate: '2027-02-19',
  });
  const version = (stopPreview.body.agreement as { version: number }).version;
  const stop = {
    schemaVersion: 1,
    type: 'storage.agreement.stop',
    commandId: randomUUID(),
    companyId: f.company,
    agreementId: b.agreementId,
    expectedVersion: version,
    confirmStop: true,
  };
  expect((await http('/agreements/' + randomUUID() + '/stop', stop, f.storA)).status).toBe(400);
  // Stopping requires assignment to the agreement's revenue branch (A).
  expect((await http('/agreements/' + b.agreementId + '/stop', stop, f.storB)).status).toBe(403);
  const stale = await http(
    '/agreements/' + b.agreementId + '/stop',
    { ...stop, commandId: randomUUID(), expectedVersion: version + 5 },
    f.storA,
  );
  expect(stale).toMatchObject({
    status: 409,
    body: { code: 'REVISION_CONFLICT', currentVersion: version },
  });
  const stopped = await http('/agreements/' + b.agreementId + '/stop', stop, f.storA);
  expect(stopped.status).toBe(200);
  expect(validateStorageViews.stopResult(stopped.body)).toBe(true);
  expect(stopped.body).toMatchObject({ stopBoundary: '2027-02-20', outstandingMinor: '21000' });
  expect(await http('/agreements/commands/' + stop.commandId + q(), undefined, f.storA)).toEqual(
    stopped,
  );
});
it('publishes every storage path in OpenAPI', () => {
  const paths = Object.keys(openApi.paths as object).filter((p) => p.startsWith('/api/v1/storage'));
  expect(paths.sort()).toEqual(
    [
      '/api/v1/storage/agreements',
      '/api/v1/storage/agreements/commands/{commandId}',
      '/api/v1/storage/agreements/{agreementId}',
      '/api/v1/storage/agreements/{agreementId}/stop',
      '/api/v1/storage/agreements/{agreementId}/stop/preview',
      '/api/v1/storage/catalog',
      '/api/v1/storage/credit-refunds',
      '/api/v1/storage/credit-refunds/commands/{commandId}',
      '/api/v1/storage/credit-refunds/preview',
      '/api/v1/storage/payments',
      '/api/v1/storage/payments/commands/{commandId}',
      '/api/v1/storage/payments/preview',
    ].sort(),
  );
});
