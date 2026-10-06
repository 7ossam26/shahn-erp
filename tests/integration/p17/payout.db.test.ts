import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { BrandPayoutResult, DispatchCommand } from '@shahn/contracts';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { payoutDetail } from '../../../apps/api/src/modules/finance/brand-payouts/service.js';
import {
  brandDues,
  walletStatement,
  walletLots,
  walletTotals,
  payoutCalendar,
} from '../../../apps/api/src/modules/finance/brand-wallet/queries.js';
import { BrandWalletService } from '../../../apps/api/src/modules/finance/brand-wallet/wallet.service.js';
import { payoutFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof payoutFixture>>;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await payoutFixture(db.pool);
});
afterAll(async () => {
  if (Object.keys(evidence).length) {
    await mkdir('docs/verification/P17', { recursive: true });
    await writeFile(
      'docs/verification/P17/native-payout-evidence.json',
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          provenance:
            'Isolated real PostgreSQL; real P12 dispatch, P13 outcome projection and P16 full receipt with controlled source HTTP. Compensation credits use the P17 typed producer with a labelled controlled source. Not independent Tawsel acceptance.',
          postgres: (await db.pool.query('SHOW server_version')).rows[0],
          ...evidence,
        },
        null,
        2,
      ) + '\n',
    );
  }
  await f?.close();
  await db?.dispose();
});
const count = async (table: string, where = 'true', args: unknown[] = []) =>
  Number((await db.pool.query(`SELECT count(*) n FROM ${table} WHERE ${where}`, args)).rows[0].n);
const reject = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { code: string; reply?: { body: { details?: Record<string, unknown> } } };
  }
  throw Error('EXPECTED_REJECTION');
};
/** Holds the shared wallet row from an independent connection to order competing writers. */
async function blockWallet(brandId: string) {
  const client = await db.pool.connect();
  await client.query('BEGIN');
  await client.query(
    `SELECT 1 FROM kernel.resource WHERE company_id=$1 AND id=$2 AND family='brand' FOR UPDATE`,
    [f.company, brandId],
  );
  let open = true;
  return async () => {
    if (!open) return;
    open = false;
    await client.query('COMMIT');
    client.release();
  };
}
async function waitForLockWaiters(n: number) {
  for (let i = 0; i < 400; i++) {
    const waiting = Number(
      (
        await db.pool.query(
          `SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND state='active'`,
        )
      ).rows[0].n,
    );
    if (waiting >= n) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw Error('LOCK_WAITERS_NOT_OBSERVED');
}
it('A01 goods 250 + shipping 50: pending 250 before full receipt, eligible 250 after, payout 100 leaves 150', async () => {
  const brand = await f.brand('براند A01');
  const x = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  let w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    pendingMinor: '25000',
    eligibleMinor: '0',
    debitsMinor: '0',
    signedEntitlementMinor: '25000',
    eligibleToPayMinor: '0',
  });
  expect(w.reasons).toContain('PENDING_REMITTANCE');
  // Pending driver-held proceeds cannot fund a payout.
  const early = await f.command(f.scope(brand, '10000'));
  expect((await reject(f.payoutService.confirm(f.admin.token, early))).code).toBe(
    'INSUFFICIENT_ELIGIBLE_CREDIT',
  );
  expect(await count('finance.brand_payout')).toBe(0);
  expect(await f.balance(f.bCash)).toBe('100000');
  const bankBefore = await f.balance(f.bank);
  const receipt = await f.remit(x.scope);
  expect(receipt.amountMinor).toBe('30000');
  expect(BigInt(await f.balance(f.bank)) - BigInt(bankBefore)).toBe(30000n);
  w = await f.wallet(brand);
  // No second shipping deduction: the 50 belongs to the company, the brand keeps 250.
  expect(w.amounts).toMatchObject({
    pendingMinor: '0',
    eligibleMinor: '25000',
    debitsMinor: '0',
    eligibleToPayMinor: '25000',
  });
  // Both payout users see the same shared total with branch-A source detail.
  for (const user of [f.payA, f.payB]) {
    const seen = await f.wallet(brand, user.token);
    expect(seen.amounts.eligibleToPayMinor).toBe('25000');
    expect(seen.branches).toEqual([
      expect.objectContaining({ branchId: f.a, eligibleMinor: '25000' }),
    ]);
  }
  const input = await f.command(f.scope(brand, '10000'), {}, f.payB.token);
  const result = (await f.payoutService.confirm(f.payB.token, input)).body as BrandPayoutResult;
  expect(result).toMatchObject({ amountMinor: '10000', eligibleToPayAfterMinor: '15000' });
  expect(await f.balance(f.bCash)).toBe('90000');
  expect(await f.balance(f.aCash)).toBe('100000');
  // Same intent replays the original result; changed payload under the same ID conflicts.
  expect((await f.payoutService.confirm(f.payB.token, input)).body).toEqual(result);
  expect(
    (await reject(f.payoutService.confirm(f.payB.token, { ...input, amountMinor: '1000' }))).code,
  ).toBe('COMMAND_PAYLOAD_CONFLICT');
  expect(await count('finance.brand_payout')).toBe(1);
  const detail = await UnitOfWork.run(db.pool, f.payA.token, f.company, 'brand.payout', (u) =>
    payoutDetail(u, result.payoutId),
  );
  expect(detail).toMatchObject({
    payingBranchId: f.b,
    accountId: f.bCash,
    method: 'cash',
    offDay: false,
    externalReference: '',
  });
  expect(detail.allocations).toEqual([
    expect.objectContaining({ amountMinor: '10000', lotKind: 'goods', sourceBranchId: f.a }),
  ]);
  expect(detail.allocations[0]!.shipment).not.toBeNull();
  // Statement explains the displayed totals to the piastre and reconciles to the lot model.
  const statement = await UnitOfWork.run(db.pool, f.payA.token, f.company, 'brand.payout', (u) =>
    walletStatement(u, brand, {}),
  );
  expect(statement.items.map((i) => [i.kind, i.amountMinor, i.balanceAfterMinor])).toEqual([
    ['goods', '25000', '25000'],
    ['payout', '-10000', '15000'],
  ]);
  expect(statement.items[1]).toMatchObject({ basis: 'paying', branchId: f.b });
  expect(statement.items[0]).toMatchObject({
    basis: 'source',
    branchId: f.a,
    readiness: 'eligible',
  });
  expect(statement.items[0]!.remittance?.id).toBe(receipt.id);
  expect(statement).toMatchObject({
    openingMinor: '0',
    creditsMinor: '25000',
    debitsMinor: '10000',
    closingMinor: '15000',
    journalMinor: '15000',
    reconciled: true,
  });
  expect(statement.current.signedEntitlementMinor).toBe('15000');
  expect(statement.current.paidMinor).toBe('10000');
  evidence.A01 = { wallet: await f.wallet(brand), detail, statement };
  await expect(
    db.pool.query(`UPDATE finance.brand_payout SET amount_minor=1 WHERE id=$1`, [result.payoutId]),
  ).rejects.toThrow('IMMUTABLE');
});
it('A02 eligible 300: simultaneous 200 payouts from branches A and B — one succeeds, the other sees 100 (both commit orders)', async () => {
  // A01 fixed the opening balances; later scenarios top up the branch cash through P09 deposits.
  await f.deposit(f.aCash, f.a, '1000000');
  await f.deposit(f.bCash, f.b, '1000000');
  const outcomes = [];
  for (const first of ['A', 'B'] as const) {
    const brand = await f.brand('براند A02 ' + first);
    await f.compensation(brand, '30000');
    const a = await f.command(
      f.scope(brand, '20000', { payingBranchId: f.a, accountId: f.aCash }),
      {},
      f.payA.token,
    );
    const b = await f.command(f.scope(brand, '20000'), {}, f.payB.token);
    const aBefore = await f.balance(f.aCash),
      bBefore = await f.balance(f.bCash);
    const release = await blockWallet(brand);
    try {
      const run = (who: 'A' | 'B') =>
        who === 'A'
          ? f.payoutService.confirm(f.payA.token, a)
          : f.payoutService.confirm(f.payB.token, b);
      const firstRun = run(first).then(
        (r) => ({ ok: true as const, r }),
        (e) => ({ ok: false as const, e }),
      );
      await waitForLockWaiters(1);
      const secondRun = run(first === 'A' ? 'B' : 'A').then(
        (r) => ({ ok: true as const, r }),
        (e) => ({ ok: false as const, e }),
      );
      await waitForLockWaiters(2);
      await release();
      const [one, two] = await Promise.all([firstRun, secondRun]);
      expect(one.ok).toBe(true);
      expect(two.ok).toBe(false);
      const failure = (
        two as {
          e: {
            code: string;
            reply: { body: { details: { amounts: { eligibleToPayMinor: string } } } };
          };
        }
      ).e;
      expect(failure.code).toBe('INSUFFICIENT_ELIGIBLE_CREDIT');
      expect(failure.reply.body.details.amounts.eligibleToPayMinor).toBe('10000');
      const w = await f.wallet(brand);
      expect(w.amounts).toMatchObject({ eligibleToPayMinor: '10000', paidMinor: '20000' });
      expect(await count('finance.brand_payout', 'brand_id=$1', [brand])).toBe(1);
      const debitedA = BigInt(aBefore) - BigInt(await f.balance(f.aCash)),
        debitedB = BigInt(bBefore) - BigInt(await f.balance(f.bCash));
      expect(debitedA + debitedB).toBe(20000n);
      expect(first === 'A' ? debitedA : debitedB).toBe(20000n);
      outcomes.push({ first, eligibleAfter: w.amounts.eligibleToPayMinor, rejected: failure.code });
    } finally {
      await release();
    }
  }
  evidence.A02 = outcomes;
});
it('A03 eligible 100 with real P12 cover 50: payable 50, payout 60 fails without debit, payout 50 keeps cover intact', async () => {
  const brand = await f.brand('براند A03');
  await f.compensation(brand, '10000');
  const shipment = await f.create({ brandId: brand, shippingPayer: 'brand' });
  const d = await f.prepared([shipment]);
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
  let w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    eligibleMinor: '10000',
    coverMinor: '5000',
    eligibleToPayMinor: '5000',
  });
  expect(w.reasons).toContain('SHIPPING_COVER');
  const tooMuch = f.scope(brand, '6000');
  expect((await f.preview(tooMuch)).blockers).toEqual(['INSUFFICIENT_ELIGIBLE_CREDIT']);
  const before = await f.balance(f.bCash);
  expect(
    (await reject(f.payoutService.confirm(f.admin.token, await f.command(tooMuch)))).code,
  ).toBe('INSUFFICIENT_ELIGIBLE_CREDIT');
  expect(await f.balance(f.bCash)).toBe(before);
  const ok = (await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '5000'))))
    .body as BrandPayoutResult;
  expect(ok.eligibleToPayAfterMinor).toBe('0');
  w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    eligibleMinor: '5000',
    coverMinor: '5000',
    eligibleToPayMinor: '0',
  });
  expect(await count('kernel.shipping_cover', 'brand_id=$1', [brand])).toBe(1);
  expect(
    await count(
      'kernel.cover_close c JOIN kernel.shipping_cover s ON s.id=c.cover_id',
      's.brand_id=$1',
      [brand],
    ),
  ).toBe(0);
  evidence.A03 = { wallet: w, payout: ok };
});
it('payout versus P12 cover reservation: both commit orders on independent connections spend the credit once', async () => {
  const results: Record<string, unknown>[] = [];
  for (const first of ['payout', 'cover'] as const) {
    const brand = await f.brand('براند سباق التغطية ' + first);
    await f.compensation(brand, '10000');
    const d = await f.prepared([await f.create({ brandId: brand, shippingPayer: 'brand' })]);
    const payoutInput = await f.command(f.scope(brand, '6000'));
    const receive = () =>
      f.commands.execute(
        f.admin.token,
        f.dispatchCommand({
          type: 'dispatch.receive',
          intentId: d.id,
          expectedVersion: d.version,
          receiptAsserted: true,
        } as Partial<DispatchCommand>),
      );
    const settle = <T>(p: Promise<T>) =>
      p.then(
        () => 'committed',
        (e: { code?: string; message?: string }) => e.code ?? e.message ?? 'failed',
      );
    const release = await blockWallet(brand);
    try {
      const firstRun = settle(
        first === 'payout' ? f.payoutService.confirm(f.admin.token, payoutInput) : receive(),
      );
      await waitForLockWaiters(1);
      const secondRun = settle(
        first === 'payout' ? receive() : f.payoutService.confirm(f.admin.token, payoutInput),
      );
      await waitForLockWaiters(2);
      await release();
      const [one, two] = await Promise.all([firstRun, secondRun]);
      const w = await f.wallet(brand);
      if (first === 'payout') {
        expect([one, two]).toEqual(['committed', 'INSUFFICIENT_SHIPPING_COVER']);
        expect(w.amounts).toMatchObject({
          eligibleMinor: '4000',
          coverMinor: '0',
          eligibleToPayMinor: '4000',
        });
      } else {
        expect([one, two]).toEqual(['committed', 'INSUFFICIENT_ELIGIBLE_CREDIT']);
        expect(w.amounts).toMatchObject({
          eligibleMinor: '10000',
          coverMinor: '5000',
          eligibleToPayMinor: '5000',
        });
        await f.completeNext();
      }
      results.push({ first, outcomes: [one, two], amounts: w.amounts });
    } finally {
      await release();
    }
  }
  evidence.coverRace = results;
});
it('A04 pending 250 with a real brand debit 50: signed 200, payable 0; after full remittance payable 200', async () => {
  const brand = await f.brand('براند A04');
  const x = await f.brandRound(brand, [
    { kind: 'full', goodsMinor: '25000' },
    { kind: 'refused', goodsMinor: '40000' },
  ]);
  let w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    pendingMinor: '25000',
    debitsMinor: '5000',
    signedEntitlementMinor: '20000',
    eligibleToPayMinor: '0',
  });
  expect(w.reasons).toEqual(expect.arrayContaining(['PENDING_REMITTANCE', 'DEBT']));
  await f.remit(x.scope);
  w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    eligibleMinor: '25000',
    debitsMinor: '5000',
    signedEntitlementMinor: '20000',
    eligibleToPayMinor: '20000',
  });
  const r = (await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '20000'))))
    .body as BrandPayoutResult;
  expect(r).toMatchObject({ eligibleToPayAfterMinor: '0', signedEntitlementAfterMinor: '0' });
  w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    eligibleMinor: '0',
    debitsMinor: '0',
    signedEntitlementMinor: '0',
  });
  const lots = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
    walletLots(u, brand, {}),
  );
  expect(lots.items).toEqual([
    expect.objectContaining({
      kind: 'goods',
      amountMinor: '25000',
      allocatedMinor: '25000',
      state: 'consumed',
    }),
  ]);
  evidence.A04 = { wallet: w, lots };
});
it('A05 off-day payout: missing reason fails; a reason never bypasses funds or a hold; agreed-day reason is rejected', async () => {
  const brand = await f.brand('براند A05', [f.weekdayToday]);
  await f.compensation(brand, '30000');
  const offDate = new Date(Date.parse(f.today + 'T00:00:00Z') - 86400000)
    .toISOString()
    .slice(0, 10);
  const offScope = f.scope(brand, '5000', { actualDate: offDate });
  expect((await f.preview(offScope)).offDay).toBe(true);
  const missing = await f.command(offScope);
  expect((await reject(f.payoutService.confirm(f.admin.token, missing))).code).toBe(
    'OFF_DAY_REASON_REQUIRED',
  );
  // Retained rejection: same intent returns the same rejection; a corrected intent needs a new ID.
  expect((await reject(f.payoutService.confirm(f.admin.token, missing))).code).toBe(
    'OFF_DAY_REASON_REQUIRED',
  );
  const reason = 'طلب البراند الصرف قبل موعده بموافقة الإدارة';
  const emptyBank = (
    (
      await (
        await import('../../../apps/api/src/modules/finance/service.js')
      )
        .financeCommands(db.pool)
        .execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'account.create',
          fields: {
            name: 'حساب إنستا باي فارغ',
            type: 'bank',
            currency: 'EGP',
            branchIds: [f.b],
            active: true,
            bankDescription: '',
          },
        })
    ).body as { entityId: string }
  ).entityId;
  const funds = await reject(
    f.payoutService.confirm(
      f.admin.token,
      await f.command(
        f.scope(brand, '3000', { actualDate: offDate, accountId: emptyBank, method: 'instapay' }),
        { offDayReason: reason },
      ),
    ),
  );
  expect(funds.code).toBe('INSUFFICIENT_FUNDS');
  const agreed = await reject(
    f.payoutService.confirm(
      f.admin.token,
      await f.command(f.scope(brand, '5000'), { offDayReason: reason }),
    ),
  );
  expect(agreed.code).toBe('OFF_DAY_REASON_NOT_APPLICABLE');
  const r = (
    await f.payoutService.confirm(
      f.admin.token,
      await f.command(offScope, { offDayReason: reason, externalReference: 'نقدي-يدوي-٧' }),
    )
  ).body as BrandPayoutResult;
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
    payoutDetail(u, r.payoutId),
  );
  expect(detail).toMatchObject({
    offDay: true,
    offDayReason: reason,
    externalReference: 'نقدي-يدوي-٧',
  });
  expect(await count('finance.brand_payout', 'brand_id=$1', [brand])).toBe(1);
  // Hold an eligible lot through the shared primitive: the reason cannot spend it.
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', async (u) => {
    const lot = (
      await u.client.query(`SELECT id FROM kernel.credit_lot WHERE company_id=$1 AND brand_id=$2`, [
        f.company,
        brand,
      ])
    ).rows[0].id as string;
    const { JournalPosting } = await import('../../../apps/api/src/modules/kernel/journals.js');
    const source = await new JournalPosting(u).source(
      { system: 'p17-gap-fixture', identity: randomUUID(), kind: 'gap', revision: '1' },
      { lot },
    );
    await BrandWalletService.lock(u, [brand]);
    await new BrandWalletService(u, brand).hold(lot, source.id, '25000', 'Known source gap');
  });
  expect((await f.wallet(brand)).amounts.eligibleToPayMinor).toBe('0');
  const held = await reject(
    f.payoutService.confirm(
      f.admin.token,
      await f.command(f.scope(brand, '1000', { actualDate: offDate }), { offDayReason: reason }),
    ),
  );
  expect(held.code).toBe('INSUFFICIENT_ELIGIBLE_CREDIT');
  evidence.A05 = { detail };
});
it('A06 confirmed compensation 400 is independently eligible through its typed source; replay adds no credit', async () => {
  const brand = await f.brand('براند A06');
  const credit = await f.compensation(brand, '40000');
  let w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    eligibleMinor: '40000',
    pendingMinor: '0',
    eligibleToPayMinor: '40000',
  });
  // A second posting against the same source identity is rejected by the unique source batch.
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', async (u) => {
      const source = (
        await u.client.query(
          `SELECT b.source_id FROM kernel.journal_effect e JOIN kernel.posting_batch b ON b.id=e.batch_id WHERE e.id=$1`,
          [credit.lotId],
        )
      ).rows[0].source_id as string;
      await BrandWalletService.lock(u, [brand]);
      await new BrandWalletService(u, brand).postCompensation({
        sourceId: source,
        recordId: (await u.client.query('SELECT id FROM command_record LIMIT 1')).rows[0].id,
        amountMinor: '40000',
        branchId: f.a,
        effectiveDate: f.today,
      });
    }),
  ).rejects.toThrow();
  w = await f.wallet(brand);
  expect(w.amounts.eligibleMinor).toBe('40000');
  const r = (await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '40000'))))
    .body as BrandPayoutResult;
  expect(r.eligibleToPayAfterMinor).toBe('0');
  evidence.A06 = { lotId: credit.lotId, payout: r };
});
it('A07 accepted correction after payout keeps the original payout, opens one linked review/hold and leaves unrelated credit usable', async () => {
  const brand = await f.brand('براند A07');
  const x = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  await f.remit(x.scope);
  const paid = (
    await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '10000')))
  ).body as BrandPayoutResult;
  const money = await count('finance.money_movement');
  const event = await f.correct(x.round);
  // Duplicate delivery of the same accepted correction creates no second review, hold or credit.
  await f.receive(event);
  await f.worker.runOne();
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
    payoutDetail(u, paid.payoutId),
  );
  expect(detail.amountMinor).toBe('10000');
  expect(detail.allocations).toEqual([expect.objectContaining({ amountMinor: '10000' })]);
  expect(detail.reviews).toHaveLength(1);
  expect(detail.reviews[0]!.state).toBe('open');
  expect(await count('finance.money_movement')).toBe(money);
  let w = await f.wallet(brand);
  expect(w.amounts).toMatchObject({
    eligibleMinor: '15000',
    heldMinor: '15000',
    eligibleToPayMinor: '0',
  });
  expect(w.openReviews).toBe(1);
  expect(
    await count('kernel.wallet_hold h JOIN kernel.credit_lot l ON l.id=h.lot_id', 'l.brand_id=$1', [
      brand,
    ]),
  ).toBe(1);
  // A preview reviewed before the unrelated credit is stale: it fails without effects.
  const stale = await f.command(f.scope(brand, '5000'));
  await f.compensation(brand, '5000', f.b);
  w = await f.wallet(brand);
  expect(w.amounts.eligibleToPayMinor).toBe('5000');
  const changed = await reject(f.payoutService.confirm(f.admin.token, stale));
  expect(changed.code).toBe('WALLET_CHANGED');
  expect(await count('finance.money_movement')).toBe(money);
  // The unrelated eligible source remains payable after review of the fresh preview.
  const unrelated = (
    await f.payoutService.confirm(f.admin.token, await f.command(f.scope(brand, '5000')))
  ).body as BrandPayoutResult;
  const unrelatedDetail = await UnitOfWork.run(
    db.pool,
    f.admin.token,
    f.company,
    'brand.payout',
    (u) => payoutDetail(u, unrelated.payoutId),
  );
  expect(unrelatedDetail.allocations).toEqual([
    expect.objectContaining({ lotKind: 'compensation', sourceBranchId: f.b }),
  ]);
  evidence.A07 = { original: detail, wallet: w };
});
it('rolls every effect back at debit, allocation, payout and result fault boundaries', async () => {
  const brand = await f.brand('براند الأعطال');
  await f.compensation(brand, '20000');
  for (const stage of ['debit', 'allocation', 'payout', 'result'] as const) {
    const input = await f.command(f.scope(brand, '5000'));
    const before = {
      payouts: await count('finance.brand_payout'),
      movements: await count('finance.money_movement'),
      allocations: await count('kernel.lot_allocation'),
      audit: await count('audit_entry'),
      balance: await f.balance(f.bCash),
    };
    const service = f.payouts({
      fault: async (at) => {
        if (at === stage) throw Error('INJECTED_' + stage);
      },
    });
    await expect(service.confirm(f.admin.token, input)).rejects.toThrow('INJECTED_' + stage);
    expect({
      payouts: await count('finance.brand_payout'),
      movements: await count('finance.money_movement'),
      allocations: await count('kernel.lot_allocation'),
      audit: await count('audit_entry'),
      balance: await f.balance(f.bCash),
    }).toEqual(before);
    expect(await count('command_record', 'command_id=$1', [input.commandId])).toBe(0);
  }
  expect((await f.wallet(brand)).amounts.eligibleToPayMinor).toBe('20000');
});
it('account lock: a payout and a P09 withdrawal competing for the last funds cannot overdraw the paying account', async () => {
  const brand = await f.brand('براند الأموال');
  await f.compensation(brand, '50000');
  const cash = (
    (
      await (
        await import('../../../apps/api/src/modules/finance/service.js')
      )
        .financeCommands(db.pool)
        .execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'account.create',
          fields: {
            name: 'خزنة صغيرة',
            type: 'bank',
            currency: 'EGP',
            branchIds: [f.b],
            active: true,
            bankDescription: '',
          },
        })
    ).body as { entityId: string }
  ).entityId;
  await f.deposit(cash, f.b, '10000', 'bank_deposit');
  const { financeCommands } = await import('../../../apps/api/src/modules/finance/service.js');
  const withdraw = () =>
    financeCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'movement.create',
      fields: {
        accountId: cash,
        branchId: f.b,
        currency: 'EGP',
        amountMinor: '7000',
        actualDate: f.today,
        method: 'bank_deposit',
        direction: 'withdrawal',
        reason: 'سحب منافس',
      },
    });
  const input = await f.command(
    f.scope(brand, '7000', { accountId: cash, method: 'bank_deposit' }),
  );
  const outcomes = await Promise.allSettled([
    f.payoutService.confirm(f.admin.token, input),
    withdraw(),
  ]);
  expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
  expect(await f.balance(cash)).toBe('3000');
  const lost = outcomes.find((o) => o.status === 'rejected') as PromiseRejectedResult;
  expect(lost.reason.code).toBe('INSUFFICIENT_FUNDS');
  if (outcomes[0]!.status === 'rejected')
    expect((await f.wallet(brand)).amounts.eligibleToPayMinor).toBe('50000');
});
it('statement/readiness queries: empty, pending-only, cross-branch totals; unlocked list totals equal the locked lot model', async () => {
  const empty = await f.brand('براند فارغ');
  let w = await f.wallet(empty);
  expect(w.amounts).toEqual({
    eligibleMinor: '0',
    pendingMinor: '0',
    debitsMinor: '0',
    heldMinor: '0',
    coverMinor: '0',
    signedEntitlementMinor: '0',
    eligibleToPayMinor: '0',
    paidMinor: '0',
  });
  expect(w.reasons).toEqual(['NO_ELIGIBLE_CREDIT']);
  expect(w.branches).toEqual([]);
  const mixed = await f.brand('براند متعدد الفروع');
  await f.brandRound(mixed, [{ kind: 'full', goodsMinor: '12000' }]);
  w = await f.wallet(mixed);
  expect(w.amounts).toMatchObject({ pendingMinor: '12000', eligibleToPayMinor: '0' });
  await f.compensation(mixed, '7000', f.b);
  w = await f.wallet(mixed);
  expect(w.branches).toEqual([
    expect.objectContaining({ branchId: f.a, pendingMinor: '12000', eligibleMinor: '0' }),
    expect.objectContaining({ branchId: f.b, eligibleMinor: '7000', pendingMinor: '0' }),
  ]);
  const sums = w.branches.reduce(
    (n, b) => ({
      e: n.e + BigInt(b.eligibleMinor),
      p: n.p + BigInt(b.pendingMinor),
      h: n.h + BigInt(b.heldMinor),
      d: n.d + BigInt(b.debitsMinor),
      c: n.c + BigInt(b.coverMinor),
    }),
    { e: 0n, p: 0n, h: 0n, d: 0n, c: 0n },
  );
  expect(sums).toEqual({ e: 7000n, p: 12000n, h: 0n, d: 0n, c: 0n });
  // Every brand in the company: the single-snapshot list SQL equals the locked P03 lot model.
  const brands = (
    await db.pool.query('SELECT id FROM commercial.brand WHERE company_id=$1 ORDER BY id', [
      f.company,
    ])
  ).rows.map((r) => r.id as string);
  const totals = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
    walletTotals(u),
  );
  for (const id of brands) {
    const locked = await f.wallet(id);
    expect(totals.get(id)).toEqual(locked.amounts);
    const statement = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
      walletStatement(u, id, {}),
    );
    expect(statement.reconciled).toBe(true);
    expect(statement.closingMinor).toBe(locked.amounts.signedEntitlementMinor);
    expect(
      BigInt(statement.openingMinor) +
        BigInt(statement.creditsMinor) -
        BigInt(statement.debitsMinor),
    ).toBe(BigInt(statement.closingMinor));
  }
  const dues = await UnitOfWork.run(db.pool, f.payA.token, f.company, 'brand.payout', (u) =>
    brandDues(u, { state: 'payable' }),
  );
  expect(dues.items.every((d) => d.amounts.eligibleToPayMinor !== '0')).toBe(true);
  expect(dues.items.map((d) => d.brandId)).toContain(mixed);
  const calendar = await UnitOfWork.run(db.pool, f.payA.token, f.company, 'brand.payout', (u) =>
    payoutCalendar(u, { from: f.today, to: f.today }),
  );
  expect(calendar.days[0]!.payouts.length).toBeGreaterThan(0);
  expect(calendar.days[0]!.scheduled.find((s) => s.brandId === mixed)?.eligibleToPayMinor).toBe(
    '7000',
  );
  evidence.queries = { mixed: w, duesTotal: dues.total };
});
it('A08 a process dies after commit; a separate process recovers it; revoked grant or branch cannot recover details', async () => {
  const brand = await f.brand('براند الاسترداد');
  await f.compensation(brand, '9000');
  const input = await f.command(f.scope(brand, '9000'), {}, f.payB.token);
  const child = (mode: 'commit' | 'recover') =>
    new Promise<{ code: number | null; stdout: string }>((resolve, rejectChild) => {
      const proc = spawn(
        process.execPath,
        ['--import', 'tsx', 'tests/integration/p17/restart-child.ts'],
        { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
      );
      let stdout = '',
        stderr = '';
      proc.stdout.on('data', (x) => (stdout += String(x)));
      proc.stderr.on('data', (x) => (stderr += String(x)));
      proc.on('error', rejectChild);
      proc.on('close', (code) =>
        code === 0 || code === 88 ? resolve({ code, stdout }) : rejectChild(Error(stderr)),
      );
      proc.stdin.end(JSON.stringify({ mode, url: db.url, token: f.payB.token, input }));
    });
  expect((await child('commit')).code).toBe(88);
  expect(await count('finance.brand_payout', 'brand_id=$1', [brand])).toBe(1);
  const recovered = JSON.parse((await child('recover')).stdout) as {
    status: number;
    body: BrandPayoutResult;
  };
  expect(recovered.body.commandId).toBe(input.commandId);
  expect((await f.payoutService.confirm(f.payB.token, input)).body).toEqual(recovered.body);
  expect(await f.balance(f.bCash)).toBeDefined();
  expect(await count('finance.brand_payout', 'brand_id=$1', [brand])).toBe(1);
  await db.pool.query(
    `INSERT INTO access.user_exception(company_id,user_id,capability,effect) VALUES($1,$2,'brand.payout','deny')`,
    [f.company, f.payB.id],
  );
  expect(
    (await reject(f.payoutService.recover(f.payB.token, f.company, input.commandId))).code,
  ).toBe('FORBIDDEN_SCOPE');
  await db.pool.query(
    `DELETE FROM access.user_exception WHERE company_id=$1 AND user_id=$2 AND capability='brand.payout'`,
    [f.company, f.payB.id],
  );
  await db.pool.query(
    `DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2 AND branch_id=$3`,
    [f.company, f.payB.id, f.b],
  );
  expect(
    (await reject(f.payoutService.recover(f.payB.token, f.company, input.commandId))).code,
  ).toBe('FORBIDDEN_SCOPE');
  await db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
    f.company,
    f.payB.id,
    f.b,
  ]);
  // Another principal cannot read this principal's retained command.
  expect(
    (await reject(f.payoutService.recover(f.payA.token, f.company, input.commandId))).code,
  ).toBe('NOT_FOUND');
  expect((await f.payoutService.recover(f.payB.token, f.company, input.commandId)).body).toEqual(
    recovered.body,
  );
});
it('database guards: a raw payout effect or payout cash movement without its payout record cannot commit', async () => {
  const brand = await f.brand('براند الحماية');
  await f.compensation(brand, '10000');
  const { JournalPosting } = await import('../../../apps/api/src/modules/kernel/journals.js');
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', async (u) => {
      const p = new JournalPosting(u),
        s = await p.source(
          { system: 'p17-forged', identity: randomUUID(), kind: 'payout', revision: '1' },
          { forged: true },
        );
      await p.lock('brand', brand);
      const record = (await u.client.query('SELECT id FROM command_record LIMIT 1')).rows[0].id;
      const e = await p.append(s.id, record, [
        {
          family: 'brand',
          kind: 'payout',
          subjectId: brand,
          amountMinor: '-1000',
          branchId: f.a,
          effectiveDate: f.today,
          supersedesId: null,
          reason: 'forged payout',
        },
      ]);
      await new BrandWalletService(u, brand).allocatePayout(e.ids[0]!, '1000');
    }),
  ).rejects.toThrow('BRAND_PAYOUT_RECORD_REQUIRED');
  expect((await f.wallet(brand)).amounts.eligibleToPayMinor).toBe('10000');
});
it('migrated wallet projections reconcile to source lots for every brand; P17 adds no eligibility', async () => {
  const rows = (
    await db.pool.query(
      `SELECT b.id,COALESCE((SELECT sum(amount_minor) FROM kernel.journal_effect e WHERE e.company_id=b.company_id AND e.family='brand' AND e.subject_id=b.id),0)::text AS journal
       FROM commercial.brand b WHERE b.company_id=$1`,
      [f.company],
    )
  ).rows;
  for (const r of rows) {
    const w = await f.wallet(r.id);
    expect(w.amounts.signedEntitlementMinor).toBe(r.journal);
  }
  // The only eligible lots are opening/compensation/fee-reversal producers or released goods.
  expect(
    await count(
      'kernel.credit_lot l JOIN kernel.journal_effect e ON e.id=l.id',
      "l.company_id=$1 AND e.kind='goods' AND l.readiness='eligible'",
      [f.company],
    ),
  ).toBe(0);
});
