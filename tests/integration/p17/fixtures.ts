import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  BrandPayoutCommand,
  BrandPayoutPreview,
  BrandPayoutScope,
  FinanceResult,
  PaymentMethod,
  RemittanceCommand,
  RemittanceResult,
} from '@shahn/contracts';
import { cairoDate } from '@shahn/domain';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { remittanceFixture } from '../p16/fixtures.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { JournalPosting } from '../../../apps/api/src/modules/kernel/journals.js';
import {
  BrandPayoutService,
  type BrandPayoutHooks,
} from '../../../apps/api/src/modules/finance/brand-payouts/service.js';
import {
  BrandWalletService,
  weekdayOf,
} from '../../../apps/api/src/modules/finance/brand-wallet/wallet.service.js';
export type TaskSpec = {
  kind: 'full' | 'refused' | 'no-answer';
  goodsMinor?: string;
  governorate?: 'cairo' | 'giza';
  shippingPayer?: 'recipient' | 'brand';
};
/**
 * P17 isolated company: branches A/B, one shared brand per scenario, A Cash, B Cash and a
 * shared Company Test Bank. Money is created only by real P09 deposits or the real P16 receipt;
 * wallet credit comes from the real P13 outcome/P16 release journey, or (explicitly labelled)
 * from the P17 typed compensation producer used to isolate a native race.
 */
export async function payoutFixture(pool: Pool, origin = 'http://127.0.0.1:5371') {
  const f = await remittanceFixture(pool, origin);
  const money = financeCommands(pool),
    today = cairoDate(new Date());
  const account = async (name: string, type: 'cash' | 'bank', branchIds: string[]) =>
    (
      (
        await money.execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'account.create',
          fields: { name, type, currency: 'EGP', branchIds, active: true, bankDescription: '' },
        })
      ).body as FinanceResult
    ).entityId;
  const aCash = await account('خزنة الفرع أ', 'cash', [f.a]),
    bCash = await account('خزنة الفرع ب', 'cash', [f.b]),
    bank = await account('بنك الشركة التجريبي', 'bank', [f.a, f.b]);
  const deposit = async (
    accountId: string,
    branchId: string,
    amountMinor: string,
    method: PaymentMethod = 'cash',
  ) =>
    money.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'movement.create',
      fields: {
        accountId,
        branchId,
        currency: 'EGP',
        amountMinor,
        actualDate: today,
        method,
        direction: 'deposit',
        reason: 'P17 isolated opening funds',
      },
    });
  await deposit(aCash, f.a, '100000');
  await deposit(bCash, f.b, '100000');
  const payoutRole = randomUUID();
  await pool.query(`INSERT INTO access.role(id,company_id,name) VALUES($1,$2,'صرف البراندات')`, [
    payoutRole,
    f.company,
  ]);
  await pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'brand.payout')`,
    [f.company, payoutRole],
  );
  const payA = await f.make('pay-a', [f.a], payoutRole),
    payB = await f.make('pay-b', [f.b], payoutRole);
  const brands = commercialCommands(pool);
  const brand = async (
    name: string,
    payoutWeekdays: number[] = [0, 1, 2, 3, 4, 5, 6],
    allowNegativeBalance = false,
  ) =>
    (
      (
        await brands.execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'brand.create',
          fields: { ...f.seed.brandFields, name, payoutWeekdays, allowNegativeBalance },
        })
      ).body as { entityId: string }
    ).entityId;
  /** Real P12 dispatch → P13 visit/outcome projection → closed round, for one brand. */
  const brandRound = async (brandId: string, specs: TaskSpec[]) => {
    const taskData = [];
    for (const s of specs)
      taskData.push(
        await f.received({
          brandId,
          governorateId: s.governorate === 'giza' ? f.seed.giza : f.seed.cairo,
          areaId: null,
          ...(s.shippingPayer === 'brand' ? { shippingPayer: 'brand' as const } : {}),
          lines: [
            {
              id: randomUUID(),
              description: 'بضاعة',
              quantity: 1,
              unitDue: { currency: 'EGP', amountMinor: s.goodsMinor ?? '25000' },
            },
          ],
        }),
      );
    const round = {
      roundId: randomUUID(),
      workdayId: randomUUID(),
      outcomes: [] as OutcomeRecord[],
      taskIds: taskData.map((x) => x.task.taskId),
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    };
    await f.receive(
      f.event(
        'round.started',
        {
          roundId: round.roundId,
          workdayId: round.workdayId,
          driverId: f.driverResource,
          startedAt: round.startedAt,
          firstPlanId: randomUUID(),
          firstForecastId: randomUUID(),
          firstWorkloadId: randomUUID(),
          taskIds: round.taskIds,
        },
        round.roundId,
        1,
        'trip',
      ),
    );
    await f.worker.runOne();
    for (let i = 0; i < taskData.length; i++) {
      const x = taskData[i]!,
        a = x.arrival();
      a.payload.roundId = round.roundId;
      await f.receive(a);
      await f.worker.runOne();
      const o = await x.outcome(specs[i]!.kind);
      o.roundId = round.roundId;
      o.workdayId = round.workdayId;
      round.outcomes.push(o);
      await f.receive(f.event('outcome.recorded', { outcome: o }, o.taskId, 2));
      await f.worker.runOne();
    }
    round.endedAt = new Date().toISOString();
    await f.receive(
      f.event(
        'round.ended',
        {
          closureId: randomUUID(),
          driverId: f.driverResource,
          workdayId: round.workdayId,
          endedRoundId: round.roundId,
          roundEndedAt: round.endedAt,
          workdayEndedAt: null,
          time: f.time(),
          tasks: round.outcomes.map((o) => ({
            taskId: o.taskId,
            dispatchCycleId: o.dispatchCycleId,
            sourceReference: o.sourceReference,
            sourceDispatchCycleId: o.sourceDispatchCycleId,
          })),
        },
        round.roundId,
        2,
        'trip',
      ),
    );
    await f.worker.runOne();
    f.rounds.set(round.roundId, round);
    return {
      round,
      scope: { companyId: f.company, branchId: f.a, driverId: f.driver, roundId: round.roundId },
    };
  };
  /** Real P16 full receipt into the shared Company Test Bank (actual remittance). */
  const remit = async (scope: Awaited<ReturnType<typeof brandRound>>['scope']) => {
    const w = await f.prepare(scope);
    if (w.blockers.length) throw Error('P17_FIXTURE_ROUND_BLOCKED:' + w.blockers.join(','));
    const input: RemittanceCommand = {
      ...scope,
      schemaVersion: 1,
      type: 'remittance.confirm',
      commandId: randomUUID(),
      witnessId: w.id,
      expectedRevision: w.revision,
      expectedDigest: w.digest,
      actualDate: today,
      components:
        w.expectedMinor === '0'
          ? []
          : [{ method: 'bank_deposit', accountId: bank, amountMinor: w.expectedMinor }],
    };
    return (await f.service.confirm(f.admin.token, input)).body as RemittanceResult;
  };
  /** Explicitly labelled controlled producer: confirmed-compensation credit via the P17 typed API. */
  const compensation = async (brandId: string, amountMinor: string, branchId = f.a) =>
    UnitOfWork.run(pool, f.admin.token, f.company, 'brand.payout', async (u) => {
      const posting = new JournalPosting(u),
        source = await posting.source(
          {
            system: 'p17-incident-fixture',
            identity: randomUUID(),
            kind: 'confirmation',
            revision: '1',
          },
          { brandId, amountMinor, branchId },
        );
      await BrandWalletService.lock(u, [brandId]);
      const record = (
        await u.client.query('SELECT id FROM command_record WHERE company_id=$1 LIMIT 1', [
          f.company,
        ])
      ).rows[0].id as string;
      return new BrandWalletService(u, brandId).postCompensation({
        sourceId: source.id,
        recordId: record,
        amountMinor,
        branchId,
        effectiveDate: today,
        reason: 'P17 controlled confirmed-compensation source',
      });
    });
  const payouts = (hooks: BrandPayoutHooks = {}) => new BrandPayoutService(pool, hooks);
  const service = payouts();
  const wallet = (brandId: string, token = f.admin.token) =>
    UnitOfWork.run(pool, token, f.company, 'brand.payout', async (u) => {
      await BrandWalletService.lock(u, [brandId]);
      return new BrandWalletService(u, brandId).summary();
    });
  const scope = (
    brandId: string,
    amountMinor: string,
    o: Partial<BrandPayoutScope> = {},
  ): BrandPayoutScope => ({
    companyId: f.company,
    brandId,
    payingBranchId: f.b,
    accountId: bCash,
    method: 'cash' as PaymentMethod,
    amountMinor,
    actualDate: today,
    ...o,
  });
  const preview = (s: BrandPayoutScope, token = f.admin.token): Promise<BrandPayoutPreview> =>
    service.preview(token, s);
  const command = async (
    s: BrandPayoutScope,
    extra: Partial<BrandPayoutCommand> = {},
    token = f.admin.token,
  ): Promise<BrandPayoutCommand> => ({
    ...s,
    schemaVersion: 1,
    type: 'brand.payout.confirm',
    commandId: randomUUID(),
    expectedReadinessRevision: (await preview(s, token)).readinessRevision,
    ...extra,
  });
  const balance = async (accountId: string) =>
    (
      await pool.query<{ amount_minor: string }>(
        'SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$2',
        [f.company, accountId],
      )
    ).rows[0]!.amount_minor;
  return {
    ...f,
    dispatchCommand: f.command,
    today,
    weekdayToday: weekdayOf(today),
    aCash,
    bCash,
    bank,
    deposit,
    payA,
    payB,
    payoutRole,
    brand,
    brandRound,
    remit,
    compensation,
    payouts,
    payoutService: service,
    wallet,
    scope,
    preview,
    command,
    balance,
  };
}
