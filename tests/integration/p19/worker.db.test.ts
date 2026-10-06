import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { createPool, migrate } from '@shahn/database';
import type { RenewalOutcome } from '../../../apps/api/src/modules/storage/renewal.js';
import { storageFixture, type StorageFixture } from './fixtures.js';

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
    'docs/verification/P19/native-worker-evidence.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  await db?.dispose();
});
/** Pauses one transaction at a hook while another competes on an independent connection. */
function gate() {
  let open!: () => void, reached!: () => void;
  const opened = new Promise<void>((r) => (open = r)),
    arrived = new Promise<void>((r) => (reached = r));
  return {
    open,
    arrived,
    wait: async () => {
      reached();
      await opened;
    },
  };
}
const settledWithin = async (promise: Promise<unknown>, ms: number) =>
  Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    new Promise((r) => setTimeout(() => r(false), ms)),
  ]);
const mine = (outcomes: RenewalOutcome[], agreementId: string) =>
  outcomes.filter(
    (o): o is Extract<RenewalOutcome, { status: 'generated' }> =>
      o.status === 'generated' && o.agreementId === agreementId,
  );
const jobs = async (agreementId: string) =>
  (
    await db.pool.query(
      `SELECT state,fence,attempts,lease_owner,source_identity FROM work_item WHERE company_id=$1 AND kind='storage.renew' AND entity_id=$2 ORDER BY created_at`,
      [f.company, agreementId],
    )
  ).rows;

describe('P19 durable renewal worker (real PostgreSQL, processes and independent connections)', () => {
  it('P19-AC-07: a worker killed after the period commit and before acknowledgement renews once', async () => {
    f.clock.today = '2027-01-13';
    const b = await f.brand('براند إعادة تشغيل العامل', '2027-01-13', '31000');
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '40000'));
    const child = await new Promise<{ code: number | null; out: string }>((resolve, reject) => {
      const p = spawn(
        process.execPath,
        ['--import', 'tsx', 'tests/integration/p19/restart-child.ts'],
        {
          stdio: ['pipe', 'pipe', 'inherit'],
          env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
        },
      );
      let out = '';
      p.stdout.on('data', (chunk) => (out += String(chunk)));
      p.once('error', reject);
      p.once('exit', (code) => resolve({ code, out }));
      p.stdin.end(
        JSON.stringify({
          url: db.url,
          token: '',
          today: f.clock.today,
          mode: 'renew-then-exit',
          leaseSeconds: 2,
        }),
      );
    });
    expect(child.code).toBe(77);
    const killed = JSON.parse(child.out) as {
      outcome: RenewalOutcome;
      lease: { id: string; fence: number };
    };
    expect(killed.outcome).toMatchObject({
      status: 'generated',
      agreementId: b.agreementId,
      periodIndex: 0,
    });
    // Committed period, unacknowledged job still leased by the dead process.
    expect(await jobs(b.agreementId)).toMatchObject([{ state: 'leased', fence: 1 }]);
    const before = await f.counts(b.brandId);
    expect(before).toMatchObject({ periods: 1, revenue: 1, allocations: 1 });
    // The lease expires; a restarted worker reclaims with a newer fence and finds the period.
    await new Promise((r) => setTimeout(r, 2500));
    const restarted = f.renewal();
    expect(await restarted.runOne()).toEqual({
      status: 'already_generated',
      agreementId: b.agreementId,
      periodIndex: 0,
    });
    expect(await jobs(b.agreementId)).toMatchObject([{ state: 'ready', fence: 2 }]);
    expect(await f.counts(b.brandId)).toEqual(before);
    const d = await f.detail(b.agreementId);
    expect(d.periods).toMatchObject([{ status: 'paid', allocatedMinor: '31000' }]);
    expect(d.credit.unallocatedMinor).toBe('9000');
    const audits = (
      await db.pool.query(
        `SELECT count(*)::int n FROM audit_entry WHERE company_id=$1 AND action='storage.period.generated' AND detail->>'agreementId'=$2`,
        [f.company, b.agreementId],
      )
    ).rows[0].n;
    expect(audits).toBe(1);
    evidence['kill-before-ack'] = { killed, jobs: await jobs(b.agreementId), counts: before };
  });

  it('fences an expired worker: it can neither renew nor overwrite the newer completion', async () => {
    f.clock.today = '2027-01-17';
    const b = await f.brand('براند حماية القفل', '2027-01-17', '31000');
    const a = f.renewal({}, 1),
      next = f.renewal({}, 60);
    await a.discover();
    const leaseA = (await a.work.claim(1))!;
    expect(leaseA.entity_id).toBe(b.agreementId);
    await new Promise((r) => setTimeout(r, 1300));
    expect(await next.runOne()).toMatchObject({ status: 'generated', agreementId: b.agreementId });
    expect(await a.renew(leaseA)).toEqual({ status: 'lease_lost' });
    expect(await a.work.finish(leaseA, { kind: 'retryable', code: 'STALE_WORKER' })).toBe(false);
    expect(await jobs(b.agreementId)).toMatchObject([{ state: 'ready', fence: 2, attempts: 2 }]);
    expect((await f.counts(b.brandId)).periods).toBe(1);
  });

  it('P19-AC-01/DOM-15: Jan 31 anchor clamps in February and restores March 31; rate change applies next period', async () => {
    f.clock.today = '2027-01-31';
    const b = await f.brand('براند نهاية الشهر', '2027-01-31', '31000');
    expect(mine(await f.renewAll(), b.agreementId)).toMatchObject([{ startDate: '2027-01-31' }]);
    f.clock.today = '2027-02-10';
    await f.updateTerms(b, { monthlyFeeMinor: '35000' });
    f.clock.today = '2027-02-27';
    expect(mine(await f.renewAll(), b.agreementId)).toEqual([]);
    f.clock.today = '2027-02-28';
    expect(mine(await f.renewAll(), b.agreementId)).toMatchObject([
      { startDate: '2027-02-28', feeMinor: '35000' },
    ]);
    f.clock.today = '2027-03-31';
    expect(mine(await f.renewAll(), b.agreementId)).toMatchObject([{ startDate: '2027-03-31' }]);
    // Worker replay adds nothing.
    for (let i = 0; i < 3; i++) expect(mine(await f.renewAll(), b.agreementId)).toEqual([]);
    const d = await f.detail(b.agreementId);
    expect(d.periods.map((p) => [p.startDate, p.endDate, p.feeMinor])).toEqual([
      ['2027-01-31', '2027-02-27', '31000'],
      ['2027-02-28', '2027-03-30', '35000'],
      ['2027-03-31', '2027-04-29', '35000'],
    ]);
    expect(await f.revenueByMonth(b.brandId)).toEqual({
      '2027-01': '31000',
      '2027-02': '35000',
      '2027-03': '35000',
    });
    // Duplicate and overlapping periods are rejected by the database itself.
    const p0 = (
      await db.pool.query(`SELECT * FROM storage.period WHERE agreement_id=$1 AND period_index=0`, [
        b.agreementId,
      ])
    ).rows[0];
    await expect(
      db.pool.query(
        `INSERT INTO storage.period(company_id,id,agreement_id,brand_id,period_index,start_date,next_start_date,fee_minor,branch_id,revision,source_id,revenue_effect_id,generated_on)
         VALUES($1,gen_random_uuid(),$2,$3,0,'2027-01-31','2027-02-28',31000,$4,1,$5,$6,'2027-01-31')`,
        [f.company, b.agreementId, b.brandId, f.a, p0.source_id, p0.revenue_effect_id],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    // No daily rows: exactly one earning effect per period.
    expect((await f.counts(b.brandId)).revenue).toBe(3);
    // Leap year: a 2028 January 31 anchor renews on February 29.
    f.clock.today = '2028-01-31';
    const leap = await f.brand('براند السنة الكبيسة', '2028-01-31', '31000');
    await f.renewAll();
    f.clock.today = '2028-02-29';
    expect(mine(await f.renewAll(), leap.agreementId)).toMatchObject([{ startDate: '2028-02-29' }]);
    f.clock.today = '2028-03-31';
    expect(mine(await f.renewAll(), leap.agreementId)).toMatchObject([{ startDate: '2028-03-31' }]);
    evidence['P19-AC-01'] = {
      periods: d.periods.map((p) => [p.startDate, p.endDate, p.feeMinor]),
      revisions: d.revisions,
    };
  });

  it('recovers missed boundaries after downtime one period per job, in order, earning each on its start', async () => {
    f.clock.today = '2028-04-15';
    const b = await f.brand('براند التعويض بعد التوقف', '2028-04-15', '31000');
    await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '50000'));
    f.clock.today = '2028-09-20';
    const outcomes = mine(await f.renewAll(), b.agreementId);
    expect(outcomes.map((o) => o.startDate)).toEqual([
      '2028-04-15',
      '2028-05-15',
      '2028-06-15',
      '2028-07-15',
      '2028-08-15',
      '2028-09-15',
    ]);
    expect(outcomes.map((o) => o.allocatedMinor)).toEqual(['31000', '19000', '0', '0', '0', '0']);
    expect(await jobs(b.agreementId)).toHaveLength(6);
    const d = await f.detail(b.agreementId);
    expect(d.periods.every((p) => p.generatedOn === '2028-09-20')).toBe(true);
    expect(await f.revenueByMonth(b.brandId)).toEqual({
      '2028-04': '31000',
      '2028-05': '31000',
      '2028-06': '31000',
      '2028-07': '31000',
      '2028-08': '31000',
      '2028-09': '31000',
    });
    expect(d.charges).toMatchObject({
      chargedMinor: '186000',
      allocatedMinor: '50000',
      outstandingMinor: '136000',
    });
  });

  it('two workers on independent pools renew many due agreements exactly once', async () => {
    f.clock.today = '2028-10-01';
    const agreements = [];
    for (let i = 0; i < 6; i++)
      agreements.push(await f.brand(`براند السباق ${i + 1}`, '2028-10-01', '31000'));
    const poolA = createPool(db.url, 3),
      poolB = createPool(db.url, 3);
    try {
      const run = async (svc: ReturnType<typeof f.renewal>) => {
        const done: RenewalOutcome[] = [];
        for (let i = 0; i < 40; i++) {
          await svc.discover();
          const o = await svc.runOne();
          if (!o) break;
          done.push(o);
        }
        return done;
      };
      const [a, b] = await Promise.all([
        run(f.renewal({}, 60, poolA)),
        run(f.renewal({}, 60, poolB)),
      ]);
      for (const x of agreements) {
        expect(mine([...a, ...b], x.agreementId)).toHaveLength(1);
        expect((await f.counts(x.brandId)).periods).toBe(1);
      }
      evidence['two-workers'] = {
        workerA: a.length,
        workerB: b.length,
      };
    } finally {
      await poolA.end();
      await poolB.end();
    }
  });

  for (const order of ['renewal-first', 'refund-first'] as const)
    it(`P19-AC-06: renewal and refund race for the same credit (${order}) on independent connections`, async () => {
      f.clock.today = '2028-11-01';
      const b = await f.brand(`براند سباق الاسترداد ${order}`, '2028-11-05', '31000');
      await f.pay(f.storA, f.scope(b.brandId, f.a, f.aCash, '50000'));
      f.clock.today = '2028-11-05';
      const g = gate(),
        svcPool = createPool(db.url, 3);
      try {
        const refundScope = f.scope(b.brandId, f.a, f.aCash, '30000');
        const fresh = await f.service().refundPreview(f.storA.token, refundScope);
        const cashBefore = await f.balance(f.aCash);
        let renewal: Promise<unknown>, refund: Promise<unknown>;
        const hold = async (work: { payload: unknown }) => {
          if ((work.payload as { agreementId: string }).agreementId === b.agreementId)
            await g.wait();
        };
        const renewalSvc = f.renewal(
          order === 'renewal-first' ? { afterPeriodInsert: hold } : {},
          60,
          svcPool,
        );
        await renewalSvc.discover();
        const refundCommand = (version: number) =>
          f.refund(
            f.storA,
            refundScope,
            { expectedCreditVersion: version },
            f.service(
              order === 'refund-first'
                ? {
                    afterCreditLock: async (_u, kind) => (kind === 'refund' ? g.wait() : undefined),
                  }
                : {},
            ),
          );
        if (order === 'renewal-first') {
          renewal = (async () => {
            const out = [];
            for (let o = await renewalSvc.runOne(); o; o = await renewalSvc.runOne()) out.push(o);
            return out;
          })();
          await g.arrived;
          refund = refundCommand(fresh.creditVersion).catch((e) => e);
          expect(await settledWithin(refund, 400)).toBe(false);
        } else {
          refund = refundCommand(fresh.creditVersion).catch((e) => e);
          await g.arrived;
          renewal = (async () => {
            const out = [];
            for (let o = await renewalSvc.runOne(); o; o = await renewalSvc.runOne()) out.push(o);
            return out;
          })();
          expect(await settledWithin(renewal, 400)).toBe(false);
        }
        g.open();
        const [renewed, refunded] = await Promise.all([renewal, refund]);
        const d = await f.detail(b.agreementId);
        if (order === 'renewal-first') {
          // Renewal allocated 310 first; the stale refund cannot spend the allocated credit.
          expect(refunded).toMatchObject({ reply: { body: { code: 'STORAGE_CREDIT_CHANGED' } } });
          const retry = await f.refund(f.storA, refundScope).catch((e) => e);
          expect(retry).toMatchObject({ reply: { body: { code: 'STORAGE_CREDIT_ALLOCATED' } } });
          expect(d.credit).toMatchObject({
            allocatedMinor: '31000',
            refundedMinor: '0',
            unallocatedMinor: '19000',
          });
          expect(await f.balance(f.aCash)).toBe(cashBefore);
        } else {
          expect(refunded).toMatchObject({ reply: { status: 200 } });
          // Renewal applied only the 200 left after the refund; the period stays partly due.
          expect(d.credit).toMatchObject({
            allocatedMinor: '20000',
            refundedMinor: '30000',
            unallocatedMinor: '0',
          });
          expect(d.periods).toMatchObject([
            { allocatedMinor: '20000', outstandingMinor: '11000', status: 'partial' },
          ]);
          expect(await f.balance(f.aCash)).toBe((BigInt(cashBefore) - 30000n).toString());
        }
        expect(mine(renewed as RenewalOutcome[], b.agreementId)).toHaveLength(1);
        const r = (await f.reconcile()).find((x) => x.brandId === b.brandId)!;
        expect(BigInt(r.unallocatedMinor) >= 0n).toBe(true);
        expect(r.movementRefundsMinor).toBe(r.refundsMinor);
        evidence['P19-AC-06-' + order] = {
          credit: d.credit,
          periods: d.periods,
          reconciliation: r,
        };
      } finally {
        await svcPool.end();
      }
    });

  for (const order of ['renewal-first', 'payment-first'] as const)
    it(`renewal and payment race (${order}): no duplicated cash, no negative credit`, async () => {
      f.clock.today = '2028-12-01';
      const b = await f.brand(`براند سباق التحصيل ${order}`, '2028-12-03', '31000');
      f.clock.today = '2028-12-03';
      const g = gate(),
        svcPool = createPool(db.url, 3);
      try {
        const scope = f.scope(b.brandId, f.b, f.bCash, '40000');
        const preview = await f.service().paymentPreview(f.storB.token, scope);
        const hold = async (work: { payload: unknown }) => {
          if ((work.payload as { agreementId: string }).agreementId === b.agreementId)
            await g.wait();
        };
        const renewalSvc = f.renewal(
          order === 'renewal-first' ? { afterPeriodInsert: hold } : {},
          60,
          svcPool,
        );
        await renewalSvc.discover();
        const drain = async () => {
          const out = [];
          for (let o = await renewalSvc.runOne(); o; o = await renewalSvc.runOne()) out.push(o);
          return out;
        };
        const payment = () =>
          f
            .pay(
              f.storB,
              scope,
              { expectedCreditVersion: preview.creditVersion },
              f.service(
                order === 'payment-first'
                  ? {
                      afterCreditLock: async (_u, kind) =>
                        kind === 'payment' ? g.wait() : undefined,
                    }
                  : {},
              ),
            )
            .catch((e) => e);
        let renewal: Promise<RenewalOutcome[]>, paid: Promise<unknown>;
        if (order === 'renewal-first') {
          renewal = drain();
          await g.arrived;
          paid = payment();
          expect(await settledWithin(paid, 400)).toBe(false);
        } else {
          paid = payment();
          await g.arrived;
          renewal = drain();
          expect(await settledWithin(renewal, 400)).toBe(false);
        }
        g.open();
        const [renewed, receipt] = await Promise.all([renewal, paid]);
        expect(mine(renewed, b.agreementId)).toHaveLength(1);
        if (order === 'renewal-first') {
          // The reviewed preview predates the new period: a new review is required.
          expect(receipt).toMatchObject({ reply: { body: { code: 'STORAGE_CREDIT_CHANGED' } } });
          expect((await f.counts(b.brandId)).receipts).toBe(0);
          const again = await f.pay(f.storB, scope);
          expect(again.preview.allocations).toMatchObject([{ amountMinor: '31000' }]);
        } else {
          expect(receipt).toMatchObject({ reply: { status: 200, body: { allocatedMinor: '0' } } });
        }
        const d = await f.detail(b.agreementId);
        expect(d.credit).toMatchObject({
          receiptsMinor: '40000',
          allocatedMinor: '31000',
          unallocatedMinor: '9000',
        });
        expect(d.periods).toMatchObject([{ status: 'paid' }]);
        expect((await f.counts(b.brandId)).receipts).toBe(1);
        const r = (await f.reconcile()).find((x) => x.brandId === b.brandId)!;
        expect(r.movementReceiptsMinor).toBe('40000');
      } finally {
        await svcPool.end();
      }
    });
});
