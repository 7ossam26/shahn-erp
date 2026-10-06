import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import {
  validateBrandPayoutViews,
  validateBrandWalletViews,
  type BrandPayoutPreview,
  type BrandPayoutResult,
} from '@shahn/contracts';
import { createApplication } from '../../../apps/api/src/app.js';
import { payoutFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof payoutFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin = '';
let brand = '';
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await payoutFixture(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
  brand = await f.brand('براند واجهة HTTP');
  const x = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  await f.remit(x.scope);
}, 120000);
afterAll(async () => {
  await app?.close();
  await f?.close();
  await db?.dispose();
});
type Who = { token: string; csrfToken: string };
async function http(
  path: string,
  body?: unknown,
  who: Who = f.admin,
  headers: Record<string, string> = {},
) {
  const r = await fetch(origin + '/api/v1/finance' + path, {
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
it('reads are session-bound, grant-scoped and closed', async () => {
  expect((await http('/brand-wallets' + q(), undefined, { token: '', csrfToken: '' })).status).toBe(
    401,
  );
  expect(
    (await http('/brand-wallets' + q(), undefined, f.admin, { Authorization: 'Bearer forged' }))
      .status,
  ).toBe(403);
  // Ordinary operations staff without the payout screen cannot see shared brand money.
  expect((await http('/brand-wallets' + q(), undefined, f.staffA)).status).toBe(403);
  expect((await http('/brand-wallets' + q('&unknown=1'), undefined, f.payA)).status).toBe(400);
  const dues = await http('/brand-wallets' + q('&state=payable'), undefined, f.payA);
  expect(dues.status).toBe(200);
  expect(validateBrandWalletViews.dues(dues.body)).toBe(true);
  const summary = await http('/brand-wallets/' + brand + q(), undefined, f.payB);
  expect(summary.status).toBe(200);
  expect(summary.body).toMatchObject({
    amounts: { eligibleToPayMinor: '25000', pendingMinor: '0' },
    branches: [expect.objectContaining({ branchId: f.a, eligibleMinor: '25000' })],
  });
  expect((await http('/brand-wallets/' + randomUUID() + q(), undefined, f.payA)).status).toBe(404);
  const lots = await http(
    '/brand-wallets/' + brand + '/lots' + q('&state=eligible'),
    undefined,
    f.payA,
  );
  expect(lots.status).toBe(200);
  expect((lots.body.items as unknown[]).length).toBe(1);
  const range = await http(
    '/brand-wallets/calendar' + q('&from=2026-10-01&to=2026-12-31'),
    undefined,
    f.payA,
  );
  expect(range.status).toBe(400);
  expect(
    (
      await http(
        '/brand-wallets/' + brand + '/statement' + q('&from=2026-10-05&to=2026-10-01'),
        undefined,
        f.payA,
      )
    ).status,
  ).toBe(400);
});
it('preview/confirm/recover through HTTP: CSRF, closed command, paying-branch scope, retained results', async () => {
  const scope = f.scope(brand, '10000');
  expect(
    (await http('/brand-payouts/preview', scope, { ...f.payB, csrfToken: 'bad' })).status,
  ).toBe(403);
  expect(
    (await http('/brand-payouts/preview', scope, f.payB, { Origin: 'https://evil.example' }))
      .status,
  ).toBe(403);
  // Paying from a branch the actor is not assigned to is denied (payA is branch A only).
  expect((await http('/brand-payouts/preview', scope, f.payA)).status).toBe(403);
  const preview = await http('/brand-payouts/preview', scope, f.payB);
  expect(preview.status).toBe(200);
  const p = preview.body as unknown as BrandPayoutPreview;
  expect(p).toMatchObject({ blockers: [], eligibleToPayAfterMinor: '15000', offDay: false });
  const command = {
    ...scope,
    schemaVersion: 1,
    type: 'brand.payout.confirm',
    commandId: randomUUID(),
    expectedReadinessRevision: p.readinessRevision,
  };
  // The browser cannot submit eligibility, holds or wallet totals.
  for (const forged of [
    { eligible: true },
    { eligibleToPayMinor: '999999' },
    { amountMinor: '100.50' },
    { amountMinor: '-100' },
    { offDayReason: '   ' },
  ])
    expect((await http('/brand-payouts/commands', { ...command, ...forged }, f.payB)).status).toBe(
      400,
    );
  const first = await http('/brand-payouts/commands', command, f.payB);
  expect(first.status).toBe(200);
  expect(validateBrandPayoutViews.result(first.body)).toBe(true);
  expect((await http('/brand-payouts/commands', command, f.payB)).body).toEqual(first.body);
  const recovered = await http(
    '/brand-payouts/commands/' + command.commandId + q(),
    undefined,
    f.payB,
  );
  expect(recovered).toEqual({ status: 200, body: first.body });
  expect(
    (await http('/brand-payouts/commands/' + command.commandId + q(), undefined, f.payA)).status,
  ).toBe(404);
  const result = first.body as unknown as BrandPayoutResult;
  const detail = await http('/brand-payouts/' + result.payoutId + q(), undefined, f.payA);
  expect(detail.status).toBe(200);
  expect(detail.body).toMatchObject({ payingBranchId: f.b, amountMinor: '10000' });
  // Insufficient eligibility is a retained, contract-shaped rejection with the current amounts.
  const over = {
    ...command,
    commandId: randomUUID(),
    amountMinor: '20000',
    expectedReadinessRevision: (
      (await http('/brand-payouts/preview', { ...scope, amountMinor: '20000' }, f.payB))
        .body as unknown as BrandPayoutPreview
    ).readinessRevision,
  };
  const rejected = await http('/brand-payouts/commands', over, f.payB);
  expect(rejected.status).toBe(409);
  expect(validateBrandPayoutViews.error(rejected.body)).toBe(true);
  expect(rejected.body).toMatchObject({
    code: 'INSUFFICIENT_ELIGIBLE_CREDIT',
    details: { amounts: { eligibleToPayMinor: '15000' } },
  });
  const retained = await http('/brand-payouts/commands/' + over.commandId + q(), undefined, f.payB);
  expect(retained.status).toBe(409);
  expect(retained.body.code).toBe('INSUFFICIENT_ELIGIBLE_CREDIT');
});
it('history filters, account history movement kind and revocation', async () => {
  const list = await http(
    '/brand-payouts' +
      q(
        '&brandId=' +
          brand +
          '&payingBranchId=' +
          f.b +
          '&sourceBranchId=' +
          f.a +
          '&method=cash&offDay=false',
      ),
    undefined,
    f.payA,
  );
  expect(list.status).toBe(200);
  expect(list.body.total).toBe(1);
  const reference = (list.body.items as { reference: string }[])[0]!.reference;
  expect(
    (await http('/brand-payouts' + q('&search=' + reference), undefined, f.payA)).body.total,
  ).toBe(1);
  expect(
    (await http('/brand-payouts' + q('&sourceBranchId=' + f.b), undefined, f.payA)).body.total,
  ).toBe(0);
  expect((await http('/brand-payouts' + q('&method=instapay'), undefined, f.payA)).body.total).toBe(
    0,
  );
  expect(
    (
      await http(
        '/brand-payouts' + q('&dateBasis=recorded&from=' + f.today + '&to=' + f.today),
        undefined,
        f.payA,
      )
    ).body.total,
  ).toBe(1);
  expect((await http('/brand-payouts' + q('&page=0'), undefined, f.payA)).status).toBe(400);
  const catalog = await http('/brand-payouts/catalog' + q(), undefined, f.payB);
  expect(catalog.status).toBe(200);
  expect((catalog.body.branches as { id: string }[]).map((b) => b.id)).toEqual([f.b]);
  // P09 account history shows the payout as its own typed movement, not a generic withdrawal.
  const movements = await http('/accounts/' + f.bCash + '/movements' + q(), undefined, f.admin);
  expect(movements.status).toBe(200);
  expect((movements.body.items as { sourceKind: string }[]).map((m) => m.sourceKind)).toContain(
    'brand_payout',
  );
  await db.pool.query(
    `INSERT INTO access.user_exception(company_id,user_id,capability,effect) VALUES($1,$2,'brand.payout','deny')`,
    [f.company, f.payA.id],
  );
  expect((await http('/brand-wallets/' + brand + q(), undefined, f.payA)).status).toBe(403);
  expect((await http('/brand-payouts' + q(), undefined, f.payA)).status).toBe(403);
});
