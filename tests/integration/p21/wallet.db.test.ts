import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type {
  BrandPayoutResult,
  SettlementCommand,
  SettlementOperation,
  SettlementResult,
} from '@shahn/contracts';
import { payoutFixture } from '../p17/fixtures.js';
import { deferred, waitForBlocked } from './fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { SettlementService } from '../../../apps/api/src/modules/settlements/service.js';
import type { SettlementHooks } from '../../../apps/api/src/modules/settlements/framework.js';
import { payoutDetail } from '../../../apps/api/src/modules/finance/brand-payouts/service.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof payoutFixture>>;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await payoutFixture(db.pool, 'http://127.0.0.1:5422');
});
afterAll(async () => {
  if (f) {
    evidence.companyId = f.company;
    await writeFile('docs/verification/P21/native-wallet.json', JSON.stringify(evidence, null, 2));
    await f.close?.();
  }
  await db?.dispose();
});
const service = (hooks: SettlementHooks = {}) => new SettlementService(db.pool, hooks);
const prepare = (operation: SettlementOperation) =>
  service().prepare(f.admin.token, { companyId: f.company, operation });
const command = (
  operation: SettlementOperation,
  p: Awaited<ReturnType<typeof prepare>>,
): SettlementCommand => ({
  schemaVersion: 1,
  commandId: randomUUID(),
  companyId: f.company,
  type: 'settlement.confirm',
  reason: 'تسوية مرتبطة بمراجعة موثقة',
  operation,
  expectedVersions: p.versions,
  expectedDigest: p.digest,
});
const settle = async (operation: SettlementOperation, hooks: SettlementHooks = {}) => {
  const p = await prepare(operation);
  const input = command(operation, p);
  return {
    preview: p,
    input,
    result: (await service(hooks).confirm(f.admin.token, input)).body as SettlementResult,
  };
};
const reject = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as Error & { code?: string };
  }
  throw Error('Expected rejection');
};
const count = async (sql: string, args: unknown[]) =>
  Number((await db.pool.query(sql, args)).rows[0].n);

it('A05 accepted source correction after payout keeps the payout and resolves exactly one linked review', async () => {
  const brand = await f.brand('براند P21 فرق المصدر');
  const x = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  await f.remit(x.scope);
  const paid = (
    await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '10000')))
  ).body as BrandPayoutResult;
  const money = await count(
    'SELECT count(*)::int n FROM finance.money_movement WHERE company_id=$1',
    [f.company],
  );
  await f.correct(x.round);
  const review = (
    await db.pool.query(
      `SELECT r.id FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) WHERE r.company_id=$1 AND v.brand_id=$2 AND r.state='open'`,
      [f.company, brand],
    )
  ).rows;
  expect(review).toHaveLength(1);
  const op = {
    operation: 'source.resolve' as const,
    reviewId: review[0].id,
    decision: 'apply_effective' as const,
    actualDate: f.today,
  };
  const p = await prepare(op);
  expect(p.facts.find((x) => x.key === 'sourceGoods')).toMatchObject({
    before: '25000',
    after: '0',
  });
  expect(p.effects.filter((e) => e.ledger === 'brand').map((e) => [e.kind, e.amountMinor])).toEqual(
    [
      ['correction', '-25000'],
      ['fee', '-5000'],
    ],
  );
  expect(p.dependents.map((d) => d.kind)).toEqual(
    expect.arrayContaining(['remittance', 'brand_payout']),
  );
  expect(p.warnings).toContain('RECEIVED_CASH_RETAINED_REVIEW_ACCOUNT');
  const input = command(op, p);
  const result = (await service().confirm(f.admin.token, input)).body as SettlementResult;
  expect(result).toMatchObject({ state: 'resolved', classification: 'source_review_correction' });
  // The payout, its allocation and the remittance cash stay exactly as posted.
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
    payoutDetail(u, paid.payoutId),
  );
  expect(detail.amountMinor).toBe('10000');
  expect(detail.allocations).toEqual([expect.objectContaining({ amountMinor: '10000' })]);
  expect(
    await count('SELECT count(*)::int n FROM finance.money_movement WHERE company_id=$1', [
      f.company,
    ]),
  ).toBe(money);
  const w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    heldMinor: '0',
    eligibleToPayMinor: '0',
    signedEntitlementMinor: '-15000',
  });
  expect(
    await count(
      `SELECT count(*)::int n FROM execution.settlement_review WHERE company_id=$1 AND id=$2 AND state='resolved'`,
      [f.company, review[0].id],
    ),
  ).toBe(1);
  expect(
    await count(
      `SELECT count(*)::int n FROM execution.review_resolution WHERE company_id=$1 AND review_id=$2`,
      [f.company, review[0].id],
    ),
  ).toBe(1);
  // Same identity replays; a fresh identity cannot resolve the same review twice.
  expect(
    ((await service().confirm(f.admin.token, input)).body as SettlementResult).resolutionId,
  ).toBe(result.resolutionId);
  const twice = await reject(
    service().confirm(f.admin.token, { ...input, commandId: randomUUID() }),
  );
  expect(['SETTLEMENT_PREVIEW_STALE', 'SETTLEMENT_ALREADY_RESOLVED']).toContain(
    twice.code ?? twice.message,
  );
  evidence.A05 = { brand, payout: paid, review: review[0].id, result, wallet: w.amounts };
});

it('retain-original source decision releases only that hold and leaves unrelated credit untouched', async () => {
  const brand = await f.brand('براند P21 إبقاء الأصل');
  const x = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '20000' }]);
  await f.remit(x.scope);
  await f.compensation(brand, '3000', f.b);
  await f.correct(x.round);
  const review = (
    await db.pool.query(
      `SELECT r.id FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) WHERE r.company_id=$1 AND v.brand_id=$2 AND r.state='open'`,
      [f.company, brand],
    )
  ).rows[0];
  let w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({ heldMinor: '20000', eligibleToPayMinor: '3000' });
  const r = await settle({
    operation: 'source.resolve',
    reviewId: review.id,
    decision: 'retain_original',
    actualDate: f.today,
  });
  expect(r.result.classification).toBe('source_review_retained');
  w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({ heldMinor: '0', eligibleToPayMinor: '23000' });
});

it('brand correction and commercial adjustment keep class/readiness; a correction racing a payout serializes on the wallet lock', async () => {
  const brand = await f.brand('براند P21 تصحيح');
  const lot = await f.compensation(brand, '20000');
  // Compensation belongs to its incident review path, never a free brand edit.
  const comp = await prepare({
    operation: 'brand.correct',
    brandId: brand,
    effectId: lot.lotId,
    amountMinor: '-1000',
    actualDate: f.today,
  });
  expect(comp.blockers).toContain('USE_INCIDENT_REVIEW');
  const credit = await settle({
    operation: 'brand.adjust',
    brandId: brand,
    branchId: f.a,
    direction: 'credit',
    amountMinor: '5000',
    agreementReference: 'اتفاق خصم تجاري رقم 7',
    actualDate: f.today,
  });
  expect(credit.result.classification).toBe('brand_commercial_unclassified');
  let w = await f.wallet(brand);
  expect(w.amounts.eligibleToPayMinor).toBe('25000');
  const adjustment = credit.result.links.find(
    (l) => l.role === 'result' && l.entityKind === 'brand_movement',
  )!.entityId;
  // Over-correction cannot flip the credit into a debit.
  const flip = await prepare({
    operation: 'brand.correct',
    brandId: brand,
    effectId: adjustment,
    amountMinor: '-6000',
    actualDate: f.today,
  });
  expect(flip.blockers).toContain('CORRECTION_CHANGES_CLASS');
  // Race: the correction holds the wallet; a payout for the full eligible amount waits, then fails.
  const op = {
    operation: 'brand.correct' as const,
    brandId: brand,
    effectId: adjustment,
    amountMinor: '-5000',
    actualDate: f.today,
  };
  const p = await prepare(op);
  const payout = await f.command(f.scope(brand, '25000'));
  const entered = deferred(),
    release = deferred();
  const correcting = service({
    afterLock: async () => {
      entered.resolve();
      await release.promise;
    },
  }).confirm(f.admin.token, command(op, p));
  await entered.promise;
  const paying = f.payoutService.confirm(f.admin.token, payout).catch((e) => e);
  await waitForBlocked(db.pool);
  release.resolve();
  await correcting;
  const failed = await paying;
  expect(failed.code ?? failed.message).toMatch(/WALLET_CHANGED|INSUFFICIENT_ELIGIBLE_CREDIT/);
  w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({ eligibleToPayMinor: '20000', paidMinor: '0' });
  // Reverse order: a payout commits first, the reviewed correction preview is then stale.
  const lot2 = await f.compensation(brand, '4000');
  void lot2;
  const stale = await prepare({
    operation: 'brand.adjust',
    brandId: brand,
    branchId: f.a,
    direction: 'debit',
    amountMinor: '1000',
    agreementReference: 'خصم',
    actualDate: f.today,
  });
  await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '1000')));
  const e = await reject(
    service().confirm(
      f.admin.token,
      command(
        {
          operation: 'brand.adjust',
          brandId: brand,
          branchId: f.a,
          direction: 'debit',
          amountMinor: '1000',
          agreementReference: 'خصم',
          actualDate: f.today,
        },
        stale,
      ),
    ),
  );
  expect(e.code ?? e.message).toBe('SETTLEMENT_PREVIEW_STALE');
  evidence.brandCorrection = {
    brand,
    credit: credit.result,
    wallet: (await f.wallet(brand)).amounts,
  };
});

it('fault injection inside source resolution rolls back corrections, hold releases and the review state', async () => {
  const brand = await f.brand('براند P21 عطل المصدر');
  const x = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '15000' }]);
  await f.remit(x.scope);
  await f.correct(x.round);
  const review = (
    await db.pool.query(
      `SELECT r.id FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) WHERE r.company_id=$1 AND v.brand_id=$2 AND r.state='open'`,
      [f.company, brand],
    )
  ).rows[0];
  const op = {
    operation: 'source.resolve' as const,
    reviewId: review.id,
    decision: 'apply_effective' as const,
    actualDate: f.today,
  };
  const effects = () =>
    count(
      `SELECT count(*)::int n FROM kernel.journal_effect WHERE company_id=$1 AND family='brand' AND subject_id=$2`,
      [f.company, brand],
    );
  const before = { effects: await effects(), wallet: (await f.wallet(brand)).amounts };
  for (const stage of ['recorded', 'effects', 'links', 'result'] as const) {
    const p = await prepare(op);
    await expect(
      service({
        fault: async (at) => {
          if (at === stage) throw Error('INJECTED_' + stage);
        },
      }).confirm(f.admin.token, command(op, p)),
    ).rejects.toThrow('INJECTED_' + stage);
    expect({ effects: await effects(), wallet: (await f.wallet(brand)).amounts }).toEqual(before);
    expect(
      await count(
        `SELECT count(*)::int n FROM execution.settlement_review WHERE id=$1 AND state='open'`,
        [review.id],
      ),
    ).toBe(1);
  }
});
