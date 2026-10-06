import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type {
  StoragePaymentCommand,
  StoragePaymentResult,
  StorageRefundResult,
} from '@shahn/contracts';
import { AccessError } from '@shahn/domain';
import { storageFixture, type StorageFixture } from './fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { agreementList } from '../../../apps/api/src/modules/storage/agreements.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>;
let f: StorageFixture;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await storageFixture(db.pool);
});
afterAll(async () => {
  await writeFile(
    'docs/verification/P19/native-storage-evidence.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  await db?.dispose();
});
const retained = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as AccessError & { reply?: { status: number; body: { code: string } } };
  }
  throw new Error('expected rejection');
};

describe('P19 storage periods, receipts, credit and refunds (real PostgreSQL)', () => {
  it('P19-AC-02/09: Jan 20–Feb 19 fee 310 at branch A, partial 100 into a branch B account', async () => {
    f.clock.today = '2027-01-01';
    const b = await f.brand('براند التخزين الجزئي — مخزون في فرعين', '2027-01-20', '31000', f.a);
    // Creating the agreement earns nothing; the period starts only when its date arrives.
    expect(await f.renewAll()).toEqual([]);
    expect((await f.counts(b.brandId)).periods).toBe(0);
    f.clock.today = '2027-01-20';
    const outcomes = await f.renewAll();
    expect(outcomes).toMatchObject([{ status: 'generated', periodIndex: 0, feeMinor: '31000' }]);
    const before = { a: await f.balance(f.aCash), b: await f.balance(f.bCash) };
    f.clock.today = '2027-01-25';
    const { reply, preview } = await f.pay(
      f.storB,
      f.scope(b.brandId, f.b, f.bCash, '10000', '2027-01-25'),
    );
    expect(preview.allocations).toMatchObject([
      {
        startDate: '2027-01-20',
        endDate: '2027-02-19',
        amountMinor: '10000',
        outstandingAfterMinor: '21000',
      },
    ]);
    const result = reply.body as StoragePaymentResult;
    expect(result).toMatchObject({
      outstandingAfterMinor: '21000',
      unallocatedCreditAfterMinor: '0',
    });
    // Revenue: complete 310 in January at agreement branch A; none in February. Cash 100 at B.
    expect(await f.revenueByMonth(b.brandId)).toEqual({ '2027-01': '31000' });
    expect(await f.balance(f.bCash)).toBe((BigInt(before.b) + 10000n).toString());
    expect(await f.balance(f.aCash)).toBe(before.a);
    const d = await f.detail(b.agreementId);
    expect(d.periods).toMatchObject([
      {
        startDate: '2027-01-20',
        endDate: '2027-02-19',
        revenueMonth: '2027-01',
        feeMinor: '31000',
        allocatedMinor: '10000',
        outstandingMinor: '21000',
        status: 'partial',
        branchId: f.a,
      },
    ]);
    expect(d.receipts).toMatchObject([{ branchId: f.b, accountId: f.bCash, amountMinor: '10000' }]);
    const effects = (
      await db.pool.query(
        `SELECT family,kind,amount_minor::text AS amount,branch_id AS branch,effective_date::text AS date FROM kernel.journal_effect
         WHERE company_id=$1 AND (subject_id=$2 OR subject_id IN (SELECT id FROM storage.period WHERE brand_id=$2)) ORDER BY recorded_at,id`,
        [f.company, b.brandId],
      )
    ).rows;
    expect(effects).toEqual([
      { family: 'operating', kind: 'storage', amount: '31000', branch: f.a, date: '2027-01-20' },
      { family: 'storage', kind: 'receipt', amount: '10000', branch: f.b, date: '2027-01-25' },
      { family: 'storage', kind: 'allocation', amount: '-10000', branch: f.b, date: '2027-01-25' },
    ]);
    // No brand payout eligibility/wallet effect and one subscription even with stock at B.
    expect((await f.counts(b.brandId)).walletEffects).toBe(0);
    await expect(
      db.pool.query(
        `INSERT INTO storage.agreement(company_id,id,brand_id,start_date,anchor_day,first_billable_index,entry_date,state,origin)
         VALUES($1,$2,$3,'2027-01-20',20,0,'2027-01-01','active','brand_setup')`,
        [f.company, randomUUID(), b.brandId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    // The receiving branch never filters earned revenue: branch filter A finds it, B does not.
    const list = (q: Record<string, string>) =>
      UnitOfWork.run(db.pool, f.storB.token, f.company, 'storage', (u) =>
        agreementList(u, q, f.storageClock),
      );
    expect((await list({ branchId: f.a, brandId: b.brandId })).items).toHaveLength(1);
    expect((await list({ branchId: f.b, brandId: b.brandId })).items).toHaveLength(0);
    expect((await list({ payment: 'partial', brandId: b.brandId })).items).toHaveLength(1);
    expect((await list({ payment: 'paid', brandId: b.brandId })).items).toHaveLength(0);
    expect(
      (await list({ paidFrom: '2027-01-25', paidTo: '2027-01-25', brandId: b.brandId })).items,
    ).toHaveLength(1);
    expect((await list({ paidFrom: '2027-01-26', brandId: b.brandId })).items).toHaveLength(0);
    evidence['P19-AC-02/09'] = { result, periods: d.periods, effects };
  });

  it('P19-AC-03: advance 500 before start, then first period 310 allocates 310 and leaves 190', async () => {
    f.clock.today = '2027-01-10';
    const b = await f.brand('براند الدفع المقدم', '2027-02-01', '31000');
    const start = await f.counts(b.brandId);
    const { reply } = await f.pay(
      f.storA,
      f.scope(b.brandId, f.a, f.bank, '50000', '2027-01-10', 'instapay'),
      { externalReference: 'IP-ADV-500' },
    );
    expect(reply.body).toMatchObject({ allocatedMinor: '0', unallocatedCreditAfterMinor: '50000' });
    let d = await f.detail(b.agreementId);
    expect(d.credit).toMatchObject({
      receiptsMinor: '50000',
      unallocatedMinor: '50000',
      allocatedMinor: '0',
    });
    expect(await f.revenueByMonth(b.brandId)).toEqual({});
    expect(d.periods).toEqual([]);
    const afterReceipt = await f.counts(b.brandId);
    f.clock.today = '2027-01-31';
    expect(
      (await f.renewAll()).filter(
        (o) => o.status === 'generated' && o.agreementId === b.agreementId,
      ),
    ).toEqual([]);
    f.clock.today = '2027-02-01';
    expect(
      (await f.renewAll()).filter(
        (o) => o.status === 'generated' && o.agreementId === b.agreementId,
      ),
    ).toMatchObject([{ periodIndex: 0, startDate: '2027-02-01', allocatedMinor: '31000' }]);
    d = await f.detail(b.agreementId);
    expect(d.credit).toMatchObject({
      receiptsMinor: '50000',
      allocatedMinor: '31000',
      unallocatedMinor: '19000',
    });
    expect(d.periods).toMatchObject([
      { status: 'paid', allocatedMinor: '31000', outstandingMinor: '0' },
    ]);
    expect(d.periods[0]!.allocations).toMatchObject([
      { triggerKind: 'renewal', amountMinor: '31000' },
    ]);
    expect(await f.revenueByMonth(b.brandId)).toEqual({ '2027-02': '31000' });
    const after = await f.counts(b.brandId);
    // The renewal created no cash movement and no second receipt; only one cash receipt exists.
    expect(after.movements).toBe(afterReceipt.movements);
    expect(after.receipts).toBe(start.receipts! + 1);
    expect(after.walletEffects).toBe(0);
    evidence['P19-AC-03'] = {
      credit: d.credit,
      periods: d.periods,
      revenue: await f.revenueByMonth(b.brandId),
    };
  });

  it('P19-AC-04: a receipt too small for two unpaid periods pays the oldest first with exact sources', async () => {
    f.clock.today = '2027-03-05';
    const b = await f.brand('براند فترتين غير مدفوعتين', '2027-03-05', '31000');
    await f.renewAll();
    f.clock.today = '2027-04-05';
    await f.renewAll();
    let d = await f.detail(b.agreementId);
    expect(d.periods.map((p) => p.status)).toEqual(['unpaid', 'unpaid']);
    expect(d.charges).toMatchObject({
      chargedMinor: '62000',
      outstandingMinor: '62000',
      overdueMinor: '31000',
    });
    expect(d.overdue).toBe(true);
    f.clock.today = '2027-04-07';
    const { reply } = await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '40000'));
    const result = reply.body as StoragePaymentResult;
    expect(result.allocations).toMatchObject([
      { startDate: '2027-03-05', amountMinor: '31000', outstandingAfterMinor: '0' },
      { startDate: '2027-04-05', amountMinor: '9000', outstandingAfterMinor: '22000' },
    ]);
    d = await f.detail(b.agreementId);
    expect(d.periods.map((p) => [p.status, p.outstandingMinor])).toEqual([
      ['paid', '0'],
      ['partial', '22000'],
    ]);
    const rows = (
      await db.pool.query(
        `SELECT a.amount_minor::text AS amount,p.start_date::text AS start,a.receipt_id AS receipt FROM storage.allocation a
         JOIN storage.period p ON p.id=a.period_id WHERE a.company_id=$1 AND a.brand_id=$2 ORDER BY p.start_date`,
        [f.company, b.brandId],
      )
    ).rows;
    expect(rows).toEqual([
      { amount: '31000', start: '2027-03-05', receipt: result.receiptId },
      { amount: '9000', start: '2027-04-05', receipt: result.receiptId },
    ]);
    expect((await f.counts(b.brandId)).walletEffects).toBe(0);
    evidence['P19-AC-04'] = { result, rows };
  });

  it('P19-AC-05: stop keeps arrears, credit and history; the worker never renews after it', async () => {
    f.clock.today = '2027-05-10';
    const b = await f.brand('براند الإيقاف', '2027-05-10', '31000');
    await f.renewAll();
    // Advance beyond the due period: arrears none, then a second unpaid period plus extra credit.
    f.clock.today = '2027-06-10';
    await f.renewAll();
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '70000'));
    let d = await f.detail(b.agreementId);
    expect(d.credit.unallocatedMinor).toBe('8000');
    // Brand setup cannot silently stop; the dedicated action does.
    const viaSetup = await retained(f.updateTerms(b, { active: false, stopDate: '2027-06-15' }));
    expect(viaSetup).toMatchObject({ code: 'STORAGE_STOP_USE_STORAGE_FLOW' });
    // Create a fresh due period with arrears before stopping.
    f.clock.today = '2027-07-10';
    await f.renewAll();
    d = await f.detail(b.agreementId);
    expect(d.charges.outstandingMinor).toBe('23000');
    const before = await f.counts(b.brandId);
    f.clock.today = '2027-07-20';
    const { reply } = await f.stop(f.storA, b.agreementId, d.version);
    expect(reply.body).toMatchObject({
      stopBoundary: '2027-08-10',
      lastServiceDate: '2027-08-09',
      outstandingMinor: '23000',
      unallocatedCreditMinor: '0',
    });
    for (const today of ['2027-08-09', '2027-08-10', '2027-12-31']) {
      f.clock.today = today;
      expect(
        (await f.renewAll()).filter(
          (o) => o.status === 'generated' && o.agreementId === b.agreementId,
        ),
      ).toEqual([]);
    }
    const after = await f.counts(b.brandId);
    expect({ ...after, creditVersion: 0, commands: 0 }).toEqual({
      ...before,
      creditVersion: 0,
      commands: 0,
    });
    d = await f.detail(b.agreementId);
    expect(d.state).toBe('stopped');
    expect(d.periods).toHaveLength(3);
    expect(d.charges.outstandingMinor).toBe('23000');
    expect(d.stop).toMatchObject({ stopBoundary: '2027-08-10', requestedOn: '2027-07-20' });
    expect(d.nextPeriodStartDate).toBeNull();
    // No automatic refund, proration or revenue reversal was posted.
    expect(await f.revenueByMonth(b.brandId)).toEqual({
      '2027-05': '31000',
      '2027-06': '31000',
      '2027-07': '31000',
    });
    const again = await retained(f.stop(f.storA, b.agreementId, d.version));
    expect(again).toMatchObject({
      reply: { status: 409, body: { code: 'STORAGE_ALREADY_STOPPED' } },
    });
    // Credit survives stop and can still receive and pay arrears.
    const pay = await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '30000'));
    expect(pay.reply.body).toMatchObject({
      outstandingAfterMinor: '0',
      unallocatedCreditAfterMinor: '7000',
    });
    evidence['P19-AC-05'] = { stop: reply.body, after: await f.detail(b.agreementId) };
  });

  it('a future agreement stopped before its first period earns no charge and keeps its credit', async () => {
    f.clock.today = '2027-01-05';
    const b = await f.brand('براند متوقف قبل البداية', '2027-03-15', '31000');
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '20000'));
    const d = await f.detail(b.agreementId);
    const { reply } = await f.stop(f.storA, b.agreementId, d.version);
    expect(reply.body).toMatchObject({
      stopBoundary: '2027-03-15',
      unallocatedCreditMinor: '20000',
    });
    f.clock.today = '2027-06-01';
    await f.renewAll();
    expect(await f.revenueByMonth(b.brandId)).toEqual({});
    expect((await f.detail(b.agreementId)).credit.unallocatedMinor).toBe('20000');
  });

  it('P19-AC-07: a duplicate receipt after a dropped response is recovered without a second credit', async () => {
    f.clock.today = '2027-08-01';
    const b = await f.brand('براند الاستجابة المفقودة', '2027-08-01', '31000');
    await f.renewAll();
    const s = f.service(),
      scope = f.scope(b.brandId, f.b, f.bCash, '5000');
    const preview = await s.paymentPreview(f.storB.token, scope);
    const command: StoragePaymentCommand = {
      ...scope,
      schemaVersion: 1,
      type: 'storage.payment.record',
      commandId: randomUUID(),
      expectedCreditVersion: preview.creditVersion,
      confirmReceived: true,
    };
    const run = (mode: 'commit' | 'recover') =>
      new Promise<{ code: number | null; out: string }>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ['--import', 'tsx', 'tests/integration/p19/restart-child.ts'],
          {
            stdio: ['pipe', 'pipe', 'inherit'],
            env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
          },
        );
        let out = '';
        child.stdout.on('data', (chunk) => (out += String(chunk)));
        child.once('error', reject);
        child.once('exit', (code) => resolve({ code, out }));
        child.stdin.end(
          JSON.stringify({
            url: db.url,
            token: f.storB.token,
            today: f.clock.today,
            mode,
            input: command,
          }),
        );
      });
    const before = await f.balance(f.bCash);
    const committed = await run('commit');
    // The process exited after commit without delivering the response.
    expect(committed).toMatchObject({ code: 88, out: '' });
    expect(await f.balance(f.bCash)).toBe((BigInt(before) + 5000n).toString());
    const recovered = await run('recover');
    expect(recovered.code).toBe(0);
    const original = JSON.parse(recovered.out) as { status: number; body: StoragePaymentResult };
    expect(original).toMatchObject({
      status: 200,
      body: { commandId: command.commandId, amountMinor: '5000' },
    });
    // Same request again in-process: retained result, no second account credit or receipt.
    const replay = await s.recordPayment(f.storB.token, command);
    expect(replay.body).toEqual(original.body);
    expect(await f.balance(f.bCash)).toBe((BigInt(before) + 5000n).toString());
    expect((await f.counts(b.brandId)).receipts).toBe(1);
    const changed = await retained(
      s.recordPayment(f.storB.token, { ...command, amountMinor: '5001' }),
    );
    expect(changed).toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
    // Recovery by another principal or without the receiving branch is denied.
    await expect(
      s.recoverPayment(f.storA.token, f.company, command.commandId),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    evidence['P19-AC-07-receipt'] = { commandId: command.commandId, recovered: original.body };
  });

  it('P19-AC-08: allocated money, beyond credit/funds, stale preview and forbidden accounts reject whole refunds', async () => {
    f.clock.today = '2027-09-01';
    const b = await f.brand('براند الاسترداد', '2027-09-01', '31000');
    await f.renewAll();
    await f.pay(f.storB, f.scope(b.brandId, f.b, f.bCash, '41000'));
    let d = await f.detail(b.agreementId);
    expect(d.credit).toMatchObject({ allocatedMinor: '31000', unallocatedMinor: '10000' });
    const snapshot = async () => ({
      counts: { ...(await f.counts(b.brandId)), commands: 0 },
      b: await f.balance(f.bCash),
      a: await f.balance(f.aCash),
      bank: await f.balance(f.bank),
    });
    let start = await snapshot();
    // Allocated money needs a P21 correction first; no unallocate shortcut exists.
    const allocated = await retained(f.refund(f.storB, f.scope(b.brandId, f.b, f.bCash, '20000')));
    expect(allocated).toMatchObject({
      reply: {
        status: 409,
        body: { code: 'STORAGE_CREDIT_ALLOCATED', details: { unallocatedMinor: '10000' } },
      },
    });
    const beyond = await retained(f.refund(f.storB, f.scope(b.brandId, f.b, f.bCash, '50000')));
    expect(beyond).toMatchObject({ reply: { body: { code: 'INSUFFICIENT_STORAGE_CREDIT' } } });
    expect(await snapshot()).toEqual(start);
    // Stale preview: an intervening receipt changes the reviewed credit version.
    const stalePreview = await f
      .service()
      .refundPreview(f.storB.token, f.scope(b.brandId, f.b, f.bCash, '5000'));
    expect(stalePreview).toMatchObject({ blockers: [], sources: [{ amountMinor: '5000' }] });
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '1000'));
    start = await snapshot();
    const stale = await retained(
      f.refund(f.storB, f.scope(b.brandId, f.b, f.bCash, '5000'), {
        expectedCreditVersion: stalePreview.creditVersion,
      }),
    );
    expect(stale).toMatchObject({
      reply: {
        status: 409,
        body: {
          code: 'STORAGE_CREDIT_CHANGED',
          details: { creditVersion: stalePreview.creditVersion + 1 },
        },
      },
    });
    // Forbidden account: B user cannot see A Cash; an A+B user cannot use A Cash for branch B.
    await expect(f.refund(f.storB, f.scope(b.brandId, f.b, f.aCash, '1000'))).rejects.toMatchObject(
      {
        code: 'NOT_FOUND',
      },
    );
    await expect(
      f.refund(f.storAB, f.scope(b.brandId, f.b, f.aCash, '1000')),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_USAGE_FORBIDDEN',
    });
    // Beyond the chosen account's actual funds (the shared bank holds nothing).
    const poor = await retained(
      f.refund(
        f.storA,
        f.scope(b.brandId, f.a, f.emptyBank, '1000', f.clock.today, 'bank_deposit'),
      ),
    );
    expect(poor).toMatchObject({
      reply: { body: { code: 'INSUFFICIENT_FUNDS', details: { availableMinor: '0' } } },
    });
    // A user without the storage grant cannot preview or refund at all.
    await expect(
      f.service().refundPreview(f.staffA.token, f.scope(b.brandId, f.a, f.aCash, '1000')),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
    expect(await snapshot()).toEqual(start);
    d = await f.detail(b.agreementId);
    expect(d.credit.unallocatedMinor).toBe('11000');
    evidence['P19-AC-08'] = {
      credit: d.credit,
      rejected: [
        'STORAGE_CREDIT_ALLOCATED',
        'INSUFFICIENT_STORAGE_CREDIT',
        'STORAGE_CREDIT_CHANGED',
        'NOT_FOUND',
        'ACCOUNT_USAGE_FORBIDDEN',
        'INSUFFICIENT_FUNDS',
        'FORBIDDEN_SCOPE',
      ],
    };
  });

  it('refunds 50 of unallocated credit once, from another permitted account, and replays the original', async () => {
    f.clock.today = '2027-10-01';
    const b = await f.brand('براند استرداد ٥٠', '2027-11-01', '31000');
    await f.pay(f.storB, f.scope(b.brandId, f.b, f.bCash, '8000'));
    const cashA = await f.balance(f.aCash),
      cashB = await f.balance(f.bCash);
    const { reply, command, preview } = await f.refund(
      f.storA,
      f.scope(b.brandId, f.a, f.aCash, '5000'),
    );
    expect(preview.sources).toMatchObject([{ amountMinor: '5000' }]);
    const result = reply.body as StorageRefundResult;
    expect(result).toMatchObject({ unallocatedCreditAfterMinor: '3000', amountMinor: '5000' });
    expect(await f.balance(f.aCash)).toBe((BigInt(cashA) - 5000n).toString());
    expect(await f.balance(f.bCash)).toBe(cashB);
    // Lost response: the same command returns the original result without another cash-out.
    expect((await f.service().refund(f.storA.token, command)).body).toEqual(result);
    expect(await f.balance(f.aCash)).toBe((BigInt(cashA) - 5000n).toString());
    const d = await f.detail(b.agreementId);
    expect(d.refunds).toMatchObject([
      {
        amountMinor: '5000',
        accountId: f.aCash,
        branchId: f.a,
        sources: [{ amountMinor: '5000' }],
      },
    ]);
    expect(d.receipts).toMatchObject([
      { accountId: f.bCash, amountMinor: '8000', refundedMinor: '5000', unallocatedMinor: '3000' },
    ]);
    // A refund is not revenue reversal and not a wallet payout.
    expect(await f.revenueByMonth(b.brandId)).toEqual({});
    expect((await f.counts(b.brandId)).walletEffects).toBe(0);
    evidence['refund-50'] = { result, refunds: d.refunds };
  });

  it('a backdated receipt is entered now against current dues without rewriting history', async () => {
    f.clock.today = '2027-02-10';
    const b = await f.brand('براند الإيصال المؤرخ سابقًا', '2027-02-10', '31000');
    await f.renewAll();
    f.clock.today = '2027-03-10';
    await f.renewAll();
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '31000'));
    const first = (await f.detail(b.agreementId)).periods.map((p) => p.allocations);
    f.clock.today = '2027-03-20';
    const { reply } = await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '10000', '2027-02-12'));
    const d = await f.detail(b.agreementId);
    expect(reply.body).toMatchObject({
      actualDate: '2027-02-12',
      allocations: [{ startDate: '2027-03-10', amountMinor: '10000' }],
    });
    expect(d.periods[0]!.allocations).toEqual(first[0]);
    const receipt = d.receipts.find((r) => r.actualDate === '2027-02-12')!;
    expect(receipt.recordedAt.slice(0, 4)).toBe(new Date().toISOString().slice(0, 4));
    // The allocation is effective now (entry), while the cash keeps its actual past date.
    const effects = (
      await db.pool.query(
        `SELECT kind,effective_date::text AS date FROM kernel.journal_effect WHERE company_id=$1 AND source_id=
         (SELECT source_id FROM storage.receipt WHERE id=$2) ORDER BY kind,family`,
        [f.company, receipt.receiptId],
      )
    ).rows;
    expect(effects).toEqual([
      { kind: 'allocation', date: '2027-03-20' },
      { kind: 'receipt', date: '2027-02-12' },
      { kind: 'receipt', date: '2027-02-12' },
    ]);
    await expect(
      f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '1000', '2027-03-21')),
    ).rejects.toMatchObject({ reply: { body: { code: 'FUTURE_PAYMENT_DATE' } } });
  });

  it('rolls back every dependent effect when a payment, refund or renewal fails mid-transaction', async () => {
    f.clock.today = '2027-04-01';
    const b = await f.brand('براند حقن الأعطال', '2027-04-01', '31000');
    await f.renewAll();
    const baseline = async () => ({
      counts: await f.counts(b.brandId),
      a: await f.balance(f.aCash),
      journal: (
        await db.pool.query(
          `SELECT count(*)::int n FROM kernel.journal_effect WHERE company_id=$1`,
          [f.company],
        )
      ).rows[0].n,
      audit: (
        await db.pool.query(`SELECT count(*)::int n FROM audit_entry WHERE company_id=$1`, [
          f.company,
        ])
      ).rows[0].n,
    });
    const start = await baseline();
    for (const stage of ['movement', 'receipt', 'allocation', 'result'] as const) {
      await expect(
        f.pay(
          f.storA,
          f.scope(b.brandId, f.a, f.aCash, '10000'),
          {},
          f.service({
            fault: async (s) => {
              if (s === stage) throw new Error('INJECTED_' + stage.toUpperCase());
            },
          }),
        ),
      ).rejects.toThrow('INJECTED_' + stage.toUpperCase());
      expect(await baseline()).toEqual(start);
    }
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '40000'));
    const funded = await baseline();
    for (const stage of ['movement', 'refund', 'result'] as const) {
      await expect(
        f.refund(
          f.storA,
          f.scope(b.brandId, f.a, f.aCash, '5000'),
          {},
          f.service({
            fault: async (s) => {
              if (s === stage) throw new Error('INJECTED_' + stage.toUpperCase());
            },
          }),
        ),
      ).rejects.toThrow('INJECTED_' + stage.toUpperCase());
      expect(await baseline()).toEqual(funded);
    }
    // Renewal failure after the period insert leaves no period, earning, allocation or audit.
    // Other agreements in this shared test company renew normally in the same queue pass.
    f.clock.today = '2027-05-01';
    const failing = f.renewal({
      afterPeriodInsert: async (work) => {
        if ((work.payload as { agreementId: string }).agreementId === b.agreementId)
          throw new Error('INJECTED_RENEWAL');
      },
    });
    await failing.discover();
    const outcomes = [];
    for (let i = 0; i < 50; i++) {
      const outcome = await failing.runOne();
      if (!outcome) break;
      outcomes.push(outcome);
    }
    expect(outcomes.filter((o) => o.status === 'retry')).toEqual([
      { status: 'retry', code: 'INJECTED_RENEWAL' },
    ]);
    expect(await f.counts(b.brandId)).toEqual(funded.counts);
    expect(await f.balance(f.aCash)).toBe(funded.a);
    expect(
      (
        await db.pool.query(
          `SELECT count(*)::int n FROM audit_entry WHERE company_id=$1 AND action='storage.period.generated' AND detail->>'agreementId'=$2`,
          [f.company, b.agreementId],
        )
      ).rows[0].n,
    ).toBe(1);
    const job = (
      await db.pool.query(
        `SELECT state,last_error,attempts FROM work_item WHERE company_id=$1 AND kind='storage.renew' AND entity_id=$2 ORDER BY created_at DESC LIMIT 1`,
        [f.company, b.agreementId],
      )
    ).rows[0];
    expect(job).toMatchObject({ state: 'pending', last_error: 'INJECTED_RENEWAL', attempts: 1 });
    expect((await f.detail(b.agreementId)).renewal).toMatchObject({
      pending: 1,
      lastError: 'INJECTED_RENEWAL',
    });
    evidence['fault-injection'] = {
      stages: ['movement', 'receipt', 'allocation', 'result', 'refund', 'renewal'],
      job,
    };
  });

  it('brand setup changes terms only prospectively and protects the original anchor', async () => {
    f.clock.today = '2027-06-01';
    const b = await f.brand('براند تغيير السعر', '2027-06-15', '31000', f.a);
    // Before service starts the change applies to the first period.
    await f.updateTerms(b, { monthlyFeeMinor: '32000' });
    f.clock.today = '2027-06-15';
    await f.renewAll();
    f.clock.today = '2027-06-20';
    await f.updateTerms(b, { monthlyFeeMinor: '35000', branchId: f.b });
    let d = await f.detail(b.agreementId);
    expect(d.periods).toMatchObject([{ feeMinor: '32000', branchId: f.a }]);
    expect(d.nextChange).toMatchObject({
      effectiveStartDate: '2027-07-15',
      feeMinor: '35000',
      branchId: f.b,
    });
    expect(d.currentFeeMinor).toBe('32000');
    const anchor = await retained(
      f.updateTerms(b, { startDate: '2027-06-16', anniversaryDay: 16 }),
    );
    expect(anchor).toMatchObject({ code: 'STORAGE_ANCHOR_IMMUTABLE' });
    b.fields = {
      ...b.fields,
      storage: { ...b.fields.storage!, startDate: '2027-06-15', anniversaryDay: 15 },
    };
    const removal = await retained(
      f.brandCommand({
        type: 'brand.update',
        entityId: b.brandId,
        expectedVersion: b.version,
        fields: { ...b.fields, services: ['brand_packed'], storage: null },
      }),
    );
    expect(removal).toMatchObject({ code: 'STORAGE_AGREEMENT_RETAINED' });
    f.clock.today = '2027-07-15';
    await f.renewAll();
    d = await f.detail(b.agreementId);
    expect(d.periods.map((p) => [p.startDate, p.feeMinor, p.branchId])).toEqual([
      ['2027-06-15', '32000', f.a],
      ['2027-07-15', '35000', f.b],
    ]);
    expect(await f.revenueByMonth(b.brandId)).toEqual({ '2027-06': '32000', '2027-07': '35000' });
    expect(d.revisions.map((r) => [r.revision, r.effectiveStartDate, r.feeMinor])).toEqual([
      [1, '2027-06-15', '31000'],
      [2, '2027-06-15', '32000'],
      [3, '2027-07-15', '35000'],
    ]);
    // A backdated entry bills from the first period starting on/after the entry date.
    f.clock.today = '2027-06-20';
    const late = await f.brand('براند اتفاق قديم', '2027-01-10', '31000');
    const ld = await f.detail(late.agreementId);
    expect(ld.firstBillableStartDate).toBe('2027-07-10');
    f.clock.today = '2027-07-10';
    expect(
      (await f.renewAll()).filter(
        (o) => o.status === 'generated' && o.agreementId === late.agreementId,
      ),
    ).toMatchObject([{ periodIndex: 6, startDate: '2027-07-10' }]);
  });

  it('database guards reject over-allocation, unrecorded storage money, history edits and retroactive terms', async () => {
    f.clock.today = '2027-01-15';
    const b = await f.brand('براند حراسة قاعدة البيانات', '2027-01-15', '31000');
    await f.renewAll();
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '40000'));
    const period = (
      await db.pool.query(`SELECT * FROM storage.period WHERE brand_id=$1`, [b.brandId])
    ).rows[0];
    const receipt = (
      await db.pool.query(`SELECT * FROM storage.receipt WHERE brand_id=$1`, [b.brandId])
    ).rows[0];
    const insertAllocation = (amount: string) =>
      db.pool.query(
        `INSERT INTO storage.allocation(company_id,id,receipt_id,period_id,brand_id,amount_minor,trigger_kind,source_id,effect_id)
         SELECT company_id,$1,receipt_id,period_id,brand_id,$2,'payment',source_id,effect_id FROM storage.allocation WHERE brand_id=$3 LIMIT 1`,
        [randomUUID(), amount, b.brandId],
      );
    await expect(insertAllocation('1')).rejects.toThrow('STORAGE_PERIOD_OVER_ALLOCATED');
    await expect(
      db.pool.query(`UPDATE storage.period SET fee_minor=1 WHERE id=$1`, [period.id]),
    ).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
    await expect(
      db.pool.query(`DELETE FROM storage.receipt WHERE id=$1`, [receipt.id]),
    ).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
    await expect(
      db.pool.query(`DELETE FROM storage.agreement WHERE id=$1`, [b.agreementId]),
    ).rejects.toThrow('STORAGE_AGREEMENT_RETAINED');
    await expect(
      db.pool.query(
        `INSERT INTO storage.agreement_revision(company_id,agreement_id,revision,effective_period_index,fee_minor,branch_id,origin,command_record_id,actor_id)
         SELECT company_id,agreement_id,revision+1,0,1,branch_id,'brand_setup',command_record_id,actor_id FROM storage.agreement_revision WHERE agreement_id=$1 ORDER BY revision DESC LIMIT 1`,
        [b.agreementId],
      ),
    ).rejects.toThrow('STORAGE_REVISION_RETROACTIVE');
    await expect(
      db.pool.query(
        `UPDATE storage.agreement SET start_date='2027-01-16',anchor_day=16,version=version+1 WHERE id=$1`,
        [b.agreementId],
      ),
    ).rejects.toThrow('STORAGE_ANCHOR_IMMUTABLE');
    // A storage cash movement or credit effect without its storage record cannot commit.
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client
        .query(
          `INSERT INTO kernel.journal_effect(id,company_id,batch_id,source_id,family,kind,subject_id,amount_minor,branch_id,effective_date,actor_id)
         SELECT $1,company_id,batch_id,source_id,'storage','refund',subject_id,-1,branch_id,effective_date,actor_id FROM kernel.journal_effect
         WHERE company_id=$2 AND family='storage' AND kind='receipt' AND subject_id=$3 LIMIT 1`,
          [randomUUID(), f.company, b.brandId],
        )
        .catch(async (e) => {
          await client.query('ROLLBACK');
          throw e;
        });
      await expect(client.query('COMMIT')).rejects.toThrow('STORAGE_RECORD_REQUIRED');
    } finally {
      client.release();
    }
    const reconciliation = (await f.reconcile()).find((r) => r.brandId === b.brandId)!;
    expect(reconciliation).toMatchObject({
      receiptsMinor: '40000',
      allocationsMinor: '31000',
      unallocatedMinor: '9000',
    });
  });

  it('reconciles every brand: rows, typed journals and actual-money movements agree exactly', async () => {
    const rows = await f.reconcile();
    expect(rows.length).toBeGreaterThan(5);
    for (const r of rows) {
      expect(r.journalReceiptsMinor).toBe(r.receiptsMinor);
      expect(r.journalAllocationsMinor).toBe(r.allocationsMinor);
      expect(r.journalRefundsMinor).toBe(r.refundsMinor);
      expect(r.journalRevenueMinor).toBe(r.chargedMinor);
      expect(r.movementReceiptsMinor).toBe(r.receiptsMinor);
      expect(r.movementRefundsMinor).toBe(r.refundsMinor);
      expect(BigInt(r.unallocatedMinor) >= 0n).toBe(true);
      expect(BigInt(r.outstandingMinor) >= 0n).toBe(true);
    }
    evidence['reconciliation'] = rows;
  });
});
