import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type { SettlementCommand, SettlementOperation, SettlementResult } from '@shahn/contracts';
import { storageFixture } from '../p19/fixtures.js';
import { deferred, waitForBlocked } from './fixtures.js';
import { SettlementService } from '../../../apps/api/src/modules/settlements/service.js';
import type { SettlementHooks } from '../../../apps/api/src/modules/settlements/framework.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>, s: Awaited<ReturnType<typeof storageFixture>>;
const evidence: Record<string, unknown> = {};
// Real Cairo dates: the advance arrives yesterday, the first service period starts today.
const today = cairoDate(new Date()),
  yesterday = cairoDate(new Date(Date.now() - 86400000));
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  s = await storageFixture(db.pool, 'http://127.0.0.1:5423');
});
afterAll(async () => {
  if (s)
    await writeFile('docs/verification/P21/native-storage.json', JSON.stringify(evidence, null, 2));
  await db?.dispose();
});
const service = (hooks: SettlementHooks = {}) =>
  new SettlementService(db.pool, hooks, { storageClock: s.storageClock });
const op = (brandId: string, amountMinor: string): SettlementOperation => ({
  operation: 'storage.refund',
  brandId,
  branchId: s.a,
  accountId: s.aCash,
  method: 'cash',
  amountMinor,
  actualDate: today,
  externalReference: '',
  confirmCashOut: true,
});
const command = (
  o: SettlementOperation,
  p: Awaited<ReturnType<SettlementService['prepare']>>,
): SettlementCommand => ({
  schemaVersion: 1,
  commandId: randomUUID(),
  companyId: s.company,
  type: 'settlement.confirm',
  reason: 'طلب البراند استرداد الرصيد المقدم غير المخصص',
  operation: o,
  expectedVersions: p.versions,
  expectedDigest: p.digest,
});
const credit = async (agreementId: string) => (await s.detail(agreementId)).credit;
async function creditedBrand(name: string) {
  s.clock.today = yesterday;
  const b = await s.brand(name, today, '31000');
  await s.pay(s.admin, s.scope(b.brandId, s.a, s.bank, '50000', yesterday, 'instapay'));
  s.clock.today = today;
  await s.renewAll();
  return b;
}

it('A07 storage credit190 refund100 leaves90, debits the account100 once and never changes earned revenue', async () => {
  const b = await creditedBrand('براند استرداد P21');
  expect(await credit(b.agreementId)).toMatchObject({
    unallocatedMinor: '19000',
    allocatedMinor: '31000',
  });
  const revenue = await s.revenueByMonth(b.brandId);
  const cash = await s.balance(s.aCash);
  const o = op(b.brandId, '10000');
  const p = await service().prepare(s.admin.token, { companyId: s.company, operation: o });
  expect(p.facts.find((x) => x.key === 'unallocatedStorageCredit')).toMatchObject({
    before: '19000',
    after: '9000',
  });
  expect(p.blockers).toEqual([]);
  const input = command(o, p);
  const r = (await service().confirm(s.admin.token, input)).body as SettlementResult;
  expect(r.classification).toBe('storage_credit_refund');
  expect(await credit(b.agreementId)).toMatchObject({
    unallocatedMinor: '9000',
    allocatedMinor: '31000',
  });
  expect(BigInt(await s.balance(s.aCash))).toBe(BigInt(cash) - 10000n);
  expect(await s.revenueByMonth(b.brandId)).toEqual(revenue);
  // Same identity: same result, one cash-out.
  await service().confirm(s.admin.token, input);
  expect(BigInt(await s.balance(s.aCash))).toBe(BigInt(cash) - 10000n);
  // Allocated money is not refundable here; it needs a justified linked charge correction first.
  const allocated = await service().prepare(s.admin.token, {
    companyId: s.company,
    operation: op(b.brandId, '20000'),
  });
  expect(allocated.blockers).toContain('STORAGE_CREDIT_ALLOCATED');
  evidence.A07 = { brand: b, result: r, credit: await credit(b.agreementId), revenue };
});

it('storage refund racing a period allocation on independent connections never spends the same credit twice', async () => {
  const b = await creditedBrand('براند سباق الاسترداد');
  // Next period starts in a month: renewal will allocate the remaining 190 against its 310 fee.
  const o = op(b.brandId, '19000');
  const p = await service().prepare(s.admin.token, { companyId: s.company, operation: o });
  const entered = deferred(),
    release = deferred();
  const refunding = service({
    afterLock: async () => {
      entered.resolve();
      await release.promise;
    },
  }).confirm(s.admin.token, command(o, p));
  await entered.promise;
  const next = new Date(Date.now() + 40 * 86400000);
  s.clock.today = cairoDate(next);
  const renewing = s.renewAll();
  await waitForBlocked(db.pool);
  release.resolve();
  await refunding;
  await renewing;
  s.clock.today = today;
  const c = await credit(b.agreementId);
  expect(c).toMatchObject({ unallocatedMinor: '0', allocatedMinor: '31000' });
  const periods = (await s.detail(b.agreementId)).periods;
  expect(periods.length).toBeGreaterThanOrEqual(2);
  expect(periods.find((x) => x.periodIndex === 1)).toMatchObject({
    allocatedMinor: '0',
    outstandingMinor: '31000',
  });
  // Reverse order: allocation first, the reviewed refund is then stale and posts nothing.
  const b2 = await creditedBrand('براند سباق عكسي');
  const o2 = op(b2.brandId, '19000');
  const p2 = await service().prepare(s.admin.token, { companyId: s.company, operation: o2 });
  s.clock.today = cairoDate(next);
  await s.renewAll();
  s.clock.today = today;
  const cash = await s.balance(s.aCash);
  const e = await service()
    .confirm(s.admin.token, command(o2, p2))
    .catch((x) => x);
  expect(e.code ?? e.message).toBe('SETTLEMENT_PREVIEW_STALE');
  expect(await s.balance(s.aCash)).toBe(cash);
  expect(await credit(b2.agreementId)).toMatchObject({ unallocatedMinor: '0' });
});
