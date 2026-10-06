import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type {
  BrandPayoutPreview,
  BrandPayoutResult,
  BrandWalletSummary,
  DispatchCommand,
} from '@shahn/contracts';
import { createApplication } from '../../../apps/api/src/app.js';
import { payoutFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof payoutFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin = '';
const log: { step: string; observed: unknown }[] = [];
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
}, 120000);
afterAll(async () => {
  if (log.length) {
    await mkdir('docs/verification/P17', { recursive: true });
    await writeFile(
      'docs/verification/P17/automated-trial.json',
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          provenance:
            'Section 8 manual-trial steps executed automatically through the real HTTP API and PostgreSQL; P13/P16 inputs use controlled source HTTP. Not an owner/manual or independent Tawsel trial.',
          steps: log,
        },
        null,
        2,
      ) + '\n',
    );
  }
  await app?.close();
  await f?.close();
  await db?.dispose();
});
type Who = { token: string; csrfToken: string };
async function http(path: string, who: Who, body?: unknown) {
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
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
}
it('owner trial: shared brand eligible 250 paid partially from B and A cash, off-day reason, cover and retry', async () => {
  const brand = await f.brand('براند التجربة اليدوية', [f.weekdayToday]);
  const money = async () => ({
    aCash: await f.balance(f.aCash),
    bCash: await f.balance(f.bCash),
    bank: await f.balance(f.bank),
  });
  expect(await money()).toEqual({ aCash: '100000', bCash: '100000', bank: '0' });
  // Real P12/P13/P16 journey: goods 250 + shipping 50, remit 300 into Company Test Bank.
  const delivered = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  await f.remit(delivered.scope);
  expect(await money()).toEqual({ aCash: '100000', bCash: '100000', bank: '30000' });
  const summary = async (who: Who) =>
    (await http(`/brand-wallets/${brand}?companyId=${f.company}`, who))
      .body as unknown as BrandWalletSummary;
  for (const who of [f.payA, f.payB]) {
    const s = await summary(who);
    expect(s.amounts.eligibleToPayMinor).toBe('25000');
    expect(s.branches).toEqual([
      expect.objectContaining({ branchId: f.a, eligibleMinor: '25000' }),
    ]);
  }
  log.push({
    step: 'both payout users see eligible 250 with branch A source',
    observed: (await summary(f.payA)).branches,
  });
  const pay = async (
    who: Who,
    branchId: string,
    accountId: string,
    amountMinor: string,
    extra: Record<string, unknown> = {},
    actualDate = f.today,
  ) => {
    const scope = {
      companyId: f.company,
      brandId: brand,
      payingBranchId: branchId,
      accountId,
      method: 'cash',
      amountMinor,
      actualDate,
    };
    const p = (await http('/brand-payouts/preview', who, scope))
      .body as unknown as BrandPayoutPreview;
    const command = {
      ...scope,
      schemaVersion: 1,
      type: 'brand.payout.confirm',
      commandId: randomUUID(),
      expectedReadinessRevision: p.readinessRevision,
      ...extra,
    };
    return { preview: p, command, reply: await http('/brand-payouts/commands', who, command) };
  };
  // 1. Pay 100 from B Cash on the agreed day.
  const first = await pay(f.payB, f.b, f.bCash, '10000');
  expect(first.reply.status).toBe(200);
  expect((await summary(f.payA)).amounts.eligibleToPayMinor).toBe('15000');
  expect(await money()).toEqual({ aCash: '100000', bCash: '90000', bank: '30000' });
  log.push({
    step: 'pay 100 from B Cash',
    observed: { result: first.reply.body, money: await money() },
  });
  // 2. Off-day attempt without reason is rejected; with reason pays 50.
  const yesterday = new Date(Date.parse(f.today + 'T00:00:00Z') - 86400000)
    .toISOString()
    .slice(0, 10);
  const noReason = await pay(f.payB, f.b, f.bCash, '5000', {}, yesterday);
  expect(noReason.preview.offDay).toBe(true);
  expect(noReason.reply).toMatchObject({ status: 409, body: { code: 'OFF_DAY_REASON_REQUIRED' } });
  expect(await f.balance(f.bCash)).toBe('90000');
  const withReason = await pay(
    f.payB,
    f.b,
    f.bCash,
    '5000',
    { offDayReason: 'طلب البراند الصرف قبل موعده' },
    yesterday,
  );
  expect(withReason.reply.status).toBe(200);
  expect((await summary(f.payA)).amounts.eligibleToPayMinor).toBe('10000');
  expect(await money()).toEqual({ aCash: '100000', bCash: '85000', bank: '30000' });
  log.push({
    step: 'off-day: rejected without reason, paid 50 with reason',
    observed: await money(),
  });
  // 3. Reserve 50 known brand-paid shipping through the real P12 service: payable 50.
  const d = await f.prepared([await f.create({ brandId: brand, shippingPayer: 'brand' })]);
  await f.commands.execute(
    f.admin.token,
    f.dispatchCommand({
      type: 'dispatch.receive',
      intentId: d.id,
      expectedVersion: d.version,
      receiptAsserted: true,
    } as Partial<DispatchCommand>),
  );
  await f.completeNext();
  let s = await summary(f.payA);
  expect(s.amounts).toMatchObject({
    eligibleMinor: '10000',
    coverMinor: '5000',
    eligibleToPayMinor: '5000',
  });
  // 4. Payout 60 fails without debit; payout 50 from A Cash succeeds; cover stays.
  const sixty = await pay(f.payA, f.a, f.aCash, '6000');
  expect(sixty.preview.blockers).toContain('INSUFFICIENT_ELIGIBLE_CREDIT');
  expect(sixty.reply).toMatchObject({
    status: 409,
    body: { code: 'INSUFFICIENT_ELIGIBLE_CREDIT' },
  });
  expect(await f.balance(f.aCash)).toBe('100000');
  const last = await pay(f.payA, f.a, f.aCash, '5000');
  expect(last.reply.status).toBe(200);
  s = await summary(f.payB);
  expect(s.amounts).toMatchObject({
    eligibleMinor: '5000',
    coverMinor: '5000',
    eligibleToPayMinor: '0',
  });
  expect(await money()).toEqual({ aCash: '95000', bCash: '85000', bank: '30000' });
  log.push({
    step: 'cover 50 reserved; 60 rejected; 50 paid from A Cash',
    observed: { amounts: s.amounts, money: await money() },
  });
  // 5. Reload/retry the last command: same result, no extra payment.
  const retry = await http('/brand-payouts/commands', f.payA, last.command);
  expect(retry).toEqual(last.reply);
  const recovered = await http(
    `/brand-payouts/commands/${last.command.commandId}?companyId=${f.company}`,
    f.payA,
  );
  expect(recovered.body).toEqual(last.reply.body);
  expect(await money()).toEqual({ aCash: '95000', bCash: '85000', bank: '30000' });
  // 6. Another unremitted delivery is pending, shown separately and not payable.
  await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  s = await summary(f.payB);
  expect(s.amounts).toMatchObject({ pendingMinor: '25000', eligibleToPayMinor: '0' });
  expect(s.reasons).toEqual(expect.arrayContaining(['PENDING_REMITTANCE', 'SHIPPING_COVER']));
  const history = await http(`/brand-payouts?companyId=${f.company}&brandId=${brand}`, f.payA);
  expect((history.body.items as BrandPayoutResult[]).length).toBe(3);
  const statement = await http(`/brand-wallets/${brand}/statement?companyId=${f.company}`, f.payB);
  expect(statement.body).toMatchObject({
    reconciled: true,
    closingMinor: (s.amounts as { signedEntitlementMinor: string }).signedEntitlementMinor,
  });
  log.push({
    step: 'retry returns original; pending 250 shown separately',
    observed: { amounts: s.amounts, payouts: history.body.total },
  });
});
