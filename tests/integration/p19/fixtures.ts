import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  BrandFields,
  FinanceResult,
  PaymentMethod,
  StorageAgreement,
  StorageAgreementDetail,
  StoragePaymentCommand,
  StorageRefundCommand,
  StorageStopCommand,
} from '@shahn/contracts';
import { reconcileStorage, storageRevenueFacts } from '@shahn/database';
import { accessFixture, fixtureConfig } from '../../support/access.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { agreementDetail } from '../../../apps/api/src/modules/storage/agreements.js';
import { controlledStorageClock } from '../../../apps/api/src/modules/storage/clock.js';
import {
  StorageService,
  type StorageHooks,
} from '../../../apps/api/src/modules/storage/service.js';
import {
  StorageRenewalService,
  type RenewalOutcome,
  type StorageRenewalHooks,
} from '../../../apps/api/src/modules/storage/renewal.js';
export type User = { id: string; token: string };
/**
 * P19 isolated company: branches A/B, A Cash, B Cash and a shared Company Test Bank funded only by
 * real P09 deposits; storage agreements only through real P04 brand setup commands; a controlled
 * storage business date (the database server clock is never changed).
 */
export async function storageFixture(pool: Pool, origin = 'http://127.0.0.1:5391') {
  const f = await accessFixture(pool, fixtureConfig(origin));
  await pool.query(
    `UPDATE access.company SET name='P19 isolated storage test company' WHERE id=$1`,
    [f.company],
  );
  const clock = { today: '2027-01-01' };
  const storageClock = controlledStorageClock(() => clock.today);
  const money = financeCommands(pool);
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
  const deposit = async (accountId: string, branchId: string, amountMinor: string) =>
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
        actualDate: '2026-10-01',
        method: 'cash',
        direction: 'deposit',
        reason: 'P19 isolated test funds, not an opening balance',
      },
    });
  const aCash = await account('خزنة الفرع أ', 'cash', [f.a]),
    bCash = await account('خزنة الفرع ب', 'cash', [f.b]),
    bank = await account('بنك الشركة التجريبي', 'bank', [f.a, f.b]),
    emptyBank = await account('حساب بنكي بلا رصيد', 'bank', [f.a, f.b]);
  await deposit(aCash, f.a, '100000');
  await deposit(bCash, f.b, '20000');
  const role = randomUUID();
  await pool.query(`INSERT INTO access.role(id,company_id,name) VALUES($1,$2,'تحصيل التخزين')`, [
    role,
    f.company,
  ]);
  await pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'storage')`,
    [f.company, role],
  );
  const storA = await f.make('stor-a', [f.a], role),
    storB = await f.make('stor-b', [f.b], role),
    storAB = await f.make('stor-ab', [f.a, f.b], role);
  const brands = commercialCommands(pool, { storageClock });
  const tier = (
    (
      await brands.execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'reference.create',
        fields: {
          kind: 'tier',
          name: 'شريحة التخزين',
          active: true,
          parentId: null,
          volumeRange: null,
        },
      })
    ).body as { entityId: string }
  ).entityId;
  const fieldsFor = (name: string, storage: StorageAgreement | null): BrandFields => ({
    name,
    active: true,
    contact: null,
    externalReference: null,
    services: storage ? ['brand_packed', 'stored_stock'] : ['brand_packed'],
    defaultService: 'brand_packed',
    tierId: tier,
    packingUpliftMinor: '0',
    partialDelivery: false,
    payoutWeekdays: [0, 1, 2, 3, 4, 5, 6],
    allowNegativeBalance: false,
    storage,
  });
  const terms = (startDate: string, feeMinor: string, branchId = f.a): StorageAgreement => ({
    monthlyFeeMinor: feeMinor,
    startDate,
    anniversaryDay: Number(startDate.slice(8)),
    branchId,
    active: true,
    stopDate: null,
  });
  const brandCommand = (input: object, token = f.admin.token) =>
    brands.execute(token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      ...input,
    } as never);
  /** Real P04 brand setup with a storage agreement; returns its storage identity. */
  const brand = async (name: string, startDate: string, feeMinor: string, branchId = f.a) => {
    const fields = fieldsFor(name, terms(startDate, feeMinor, branchId));
    const brandId = (
      (await brandCommand({ type: 'brand.create', fields })).body as { entityId: string }
    ).entityId;
    const agreementId = (
      await pool.query<{ id: string }>(
        `SELECT id FROM storage.agreement WHERE company_id=$1 AND brand_id=$2`,
        [f.company, brandId],
      )
    ).rows[0]!.id;
    return { brandId, agreementId, fields, version: 1 };
  };
  /** Prospective terms change through the same brand setup command. */
  const updateTerms = async (
    b: { brandId: string; fields: BrandFields; version: number },
    storage: Partial<StorageAgreement>,
  ) => {
    const fields = { ...b.fields, storage: { ...b.fields.storage!, ...storage } };
    const reply = await brandCommand({
      type: 'brand.update',
      entityId: b.brandId,
      expectedVersion: b.version,
      fields,
    });
    b.fields = fields;
    b.version = (reply.body as { version: number }).version;
    return reply;
  };
  const service = (hooks: StorageHooks = {}) => new StorageService(pool, storageClock, hooks);
  const renewal = (hooks: StorageRenewalHooks = {}, leaseSeconds = 60, p: Pool = pool) =>
    new StorageRenewalService(p, { clock: storageClock, leaseSeconds, hooks });
  /** Discovery plus every claimable job until the queue is idle. */
  const renewAll = async (svc = renewal()) => {
    const outcomes: RenewalOutcome[] = [];
    for (let i = 0; i < 200; i++) {
      await svc.discover();
      const outcome = await svc.runOne();
      if (!outcome) break;
      outcomes.push(outcome);
    }
    return outcomes;
  };
  const scope = (
    brandId: string,
    branchId: string,
    accountId: string,
    amountMinor: string,
    actualDate = clock.today,
    method: PaymentMethod = 'cash',
  ) => ({ companyId: f.company, brandId, branchId, accountId, method, amountMinor, actualDate });
  /** Preview, then confirm the reviewed preview exactly as the UI does. */
  const pay = async (
    user: User,
    s: ReturnType<typeof scope>,
    extra: Partial<StoragePaymentCommand> = {},
    svc = service(),
  ) => {
    const preview = await svc.paymentPreview(user.token, s);
    const command: StoragePaymentCommand = {
      ...s,
      schemaVersion: 1,
      type: 'storage.payment.record',
      commandId: randomUUID(),
      expectedCreditVersion: preview.creditVersion,
      confirmReceived: true,
      ...extra,
    };
    return { preview, command, reply: await svc.recordPayment(user.token, command) };
  };
  const refund = async (
    user: User,
    s: ReturnType<typeof scope>,
    extra: Partial<StorageRefundCommand> = {},
    svc = service(),
  ) => {
    const preview = await svc.refundPreview(user.token, s);
    const command: StorageRefundCommand = {
      ...s,
      schemaVersion: 1,
      type: 'storage.credit.refund',
      commandId: randomUUID(),
      reason: 'استرداد رصيد تخزين غير مخصص بطلب البراند',
      expectedCreditVersion: preview.creditVersion,
      confirmCashOut: true,
      ...extra,
    };
    return { preview, command, reply: await svc.refund(user.token, command) };
  };
  const stop = async (
    user: User,
    agreementId: string,
    expectedVersion: number,
    svc = service(),
  ) => {
    const command: StorageStopCommand = {
      schemaVersion: 1,
      type: 'storage.agreement.stop',
      commandId: randomUUID(),
      companyId: f.company,
      agreementId,
      expectedVersion,
      reason: 'طلب البراند إنهاء التخزين بعد الفترة الحالية',
      confirmStop: true,
    };
    return { command, reply: await svc.stop(user.token, command) };
  };
  const detail = (agreementId: string, token = f.admin.token): Promise<StorageAgreementDetail> =>
    UnitOfWork.run(pool, token, f.company, 'storage', (u) =>
      agreementDetail(u, agreementId, storageClock),
    );
  const balance = async (accountId: string) =>
    (
      await pool.query<{ amount: string }>(
        `SELECT amount_minor::text AS amount FROM finance.account_balance WHERE company_id=$1 AND account_id=$2`,
        [f.company, accountId],
      )
    ).rows[0]!.amount;
  /** Immutable counts used to prove "no partial/duplicate effects". */
  const counts = async (brandId: string) =>
    (
      await pool.query<Record<string, number>>(
        `SELECT (SELECT count(*)::int FROM storage.period WHERE company_id=$1 AND brand_id=$2) periods,
         (SELECT count(*)::int FROM storage.receipt WHERE company_id=$1 AND brand_id=$2) receipts,
         (SELECT count(*)::int FROM storage.allocation WHERE company_id=$1 AND brand_id=$2) allocations,
         (SELECT count(*)::int FROM storage.refund WHERE company_id=$1 AND brand_id=$2) refunds,
         (SELECT count(*)::int FROM kernel.journal_effect e JOIN storage.period p ON(p.company_id,p.revenue_effect_id)=(e.company_id,e.id)
          WHERE p.company_id=$1 AND p.brand_id=$2) revenue,
         (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1 AND family='storage' AND subject_id=$2) "creditEffects",
         (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1 AND family='brand' AND subject_id=$2) "walletEffects",
         (SELECT count(*)::int FROM finance.money_movement WHERE company_id=$1 AND source_kind IN ('storage_receipt','storage_refund')) movements,
         (SELECT count(*)::int FROM command_record WHERE company_id=$1 AND family LIKE 'storage.%') commands,
         (SELECT version FROM storage.credit_account WHERE company_id=$1 AND brand_id=$2) "creditVersion"`,
        [f.company, brandId],
      )
    ).rows[0]!;
  /** Revenue by Cairo calendar month from immutable period-start journal effects. */
  const revenueByMonth = async (brandId: string, from = '2026-01-01', to = '2031-01-01') => {
    const facts = await storageRevenueFacts(pool, f.company, { from, to });
    const months: Record<string, string> = {};
    for (const x of facts.filter((x) => x.brandId === brandId))
      months[x.effectiveDate.slice(0, 7)] = (
        BigInt(months[x.effectiveDate.slice(0, 7)] ?? '0') + BigInt(x.amountMinor)
      ).toString();
    return months;
  };
  const reconcile = () => reconcileStorage(pool, f.company);
  return {
    ...f,
    clock,
    storageClock,
    money,
    aCash,
    bCash,
    bank,
    emptyBank,
    deposit,
    storA,
    storB,
    storAB,
    tier,
    brands,
    brand,
    brandCommand,
    fieldsFor,
    terms,
    updateTerms,
    service,
    renewal,
    renewAll,
    scope,
    pay,
    refund,
    stop,
    detail,
    balance,
    counts,
    revenueByMonth,
    reconcile,
  };
}
export type StorageFixture = Awaited<ReturnType<typeof storageFixture>>;
